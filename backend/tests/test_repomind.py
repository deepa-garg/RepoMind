import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.parser.ast_parser import ASTParser
from app.services.graph.dependency_graph import DependencyGraphService
from app.services.retrieval.vector_store import VectorStoreService
from app.services.analysis.health_scorer import HealthScorerService
from app.services.analysis.security_auditor import SecurityAuditorService
from app.demo.ecommerce_repo import DEMO_REPO_FILES

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "RepoMind" in data["service"]

def test_get_demo_repository():
    response = client.get("/api/repositories/demo-ecommerce")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "ecommerce-platform"
    assert data["is_demo"] is True
    assert data["file_count"] > 10
    assert data["codebase_health"]["overall"] > 70

def test_ast_parsing():
    sample_code = """import jwt from 'jsonwebtoken';
export class AuthService {
  public async login(email: string, pass: string): Promise<any> {
    if (!email) {
      throw new Error('MISSING_EMAIL');
    }
    return jwt.sign({ email }, 'secret');
  }
}
"""
    symbols, file_info = ASTParser.parse_file("src/auth/AuthService.ts", sample_code, "typescript")
    assert file_info.layer == "service"
    symbol_names = [s.name for s in symbols]
    assert "AuthService" in symbol_names
    assert "login" in symbol_names

def test_dependency_graph():
    graph_svc = DependencyGraphService()
    graph_data = graph_svc.build_from_repo_data(DEMO_REPO_FILES)
    assert len(graph_data.nodes) > 10
    assert len(graph_data.edges) > 5

    # Test call chain query
    chain = graph_svc.get_call_chain("AuthService.login")
    assert isinstance(chain, list)

def test_vector_search():
    store = VectorStoreService()
    store.index_repository(DEMO_REPO_FILES)
    results = store.hybrid_search("validate token jwt", limit=3)
    assert len(results) > 0
    assert any("Token" in r.symbol_name or "Auth" in r.symbol_name for r in results)

def test_bug_investigation_endpoint():
    response = client.post("/api/bug-analysis", json={
        "description": "Users are getting logged out after refreshing the page",
        "repository_id": "demo-ecommerce"
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["hypotheses"]) > 0
    assert "TokenService" in data["root_cause_prediction"] or "verifyToken" in data["root_cause_prediction"]

def test_impact_analysis_endpoint():
    response = client.post("/api/impact-analysis", json={
        "repository_id": "demo-ecommerce",
        "target_symbol": "AuthService.validateToken"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] in ["HIGH", "MEDIUM", "LOW"]
    assert len(data["affected_controllers"]) > 0

def test_codebase_health_calculation():
    health = HealthScorerService.calculate_health(DEMO_REPO_FILES)
    assert 60 <= health.overall <= 100
    assert health.maintainability > 0
    assert health.security > 0

def test_security_audit():
    audit = SecurityAuditorService.audit(DEMO_REPO_FILES)
    assert len(audit.findings) > 0
    severities = [f.severity for f in audit.findings]
    assert "Critical" in severities or "High" in severities

def test_assistant_chat_endpoint():
    response = client.post("/api/chat", json={
        "message": "How does authentication work?",
        "repository_id": "demo-ecommerce",
        "session_id": "test-session"
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["flow_steps"]) > 0
    assert len(data["sources"]) > 0
    assert "AuthController" in data["answer"] or "AuthService" in data["answer"]
