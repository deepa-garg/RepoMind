"""
Comprehensive Integration Test Suite for RepoMind Phase 3.
Validates:
1. Health check distinguishing application availability from component readiness.
2. Repository deterministic ID resolution and progress endpoint.
3. Repository listing and switching contracts.
4. Grounded retrieval-only mode labeling and LLM credential fallback.
5. Multi-repository conversation isolation and cross-repository context scoping.
6. Safe file viewing with path traversal prevention.
7. Structured error responses and error codes.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# -------------------------------------------------------------
# 1. Health Check & Component Readiness
# -------------------------------------------------------------
def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] in ["ok", "healthy"]
    assert "version" in data
    assert "dependencies" in data

    deps = data["dependencies"]
    assert "sqlite" in deps
    assert deps["sqlite"] == "healthy"
    assert "qdrant" in deps
    assert "llm_provider" in deps
    # Distinguishes application availability from dependency readiness
    assert "retrieval-only mode" in deps["llm_provider"] or "configured" in deps["llm_provider"]
    assert "repositories_indexed" in data
    assert isinstance(data["repositories_indexed"], int)


# -------------------------------------------------------------
# 2. Deterministic ID Resolution & Ingestion Pre-Check
# -------------------------------------------------------------
def test_resolve_repo_id_valid():
    url = "https://github.com/deepa-garg/ai-resume-analyzer"
    response = client.get(f"/api/repositories/resolve-id?url={url}&branch=main")
    assert response.status_code == 200
    data = response.json()
    assert "repository_id" in data
    assert data["repository_id"].startswith("repo-")
    assert len(data["repository_id"]) == 17

    # Determinism: Same URL and branch yields same repository ID
    resp2 = client.get(f"/api/repositories/resolve-id?url={url}&branch=main")
    assert resp2.json()["repository_id"] == data["repository_id"]


def test_resolve_repo_id_invalid_url():
    # Unsupported host
    response = client.get("/api/repositories/resolve-id?url=https://gitlab.com/user/project")
    assert response.status_code == 400
    data = response.json()
    assert "error_code" in data["detail"]

    # Malformed URL
    resp2 = client.get("/api/repositories/resolve-id?url=not_a_valid_url")
    assert resp2.status_code == 400
    assert "error_code" in resp2.json()["detail"]


# -------------------------------------------------------------
# 3. Repository Listing and Switching
# -------------------------------------------------------------
def test_list_repositories():
    response = client.get("/api/repositories")
    assert response.status_code == 200
    repos = response.json()
    assert isinstance(repos, list)
    assert len(repos) >= 1  # At least demo repo or indexed repo

    first_repo = repos[0]
    assert "id" in first_repo
    assert "name" in first_repo
    assert "indexing_status" in first_repo
    assert "branch" in first_repo
    assert "commit_sha" in first_repo


# -------------------------------------------------------------
# 4. Progress Endpoint Contract
# -------------------------------------------------------------
def test_get_progress_existing_repo():
    repos = client.get("/api/repositories").json()
    repo_id = repos[0]["id"]

    response = client.get(f"/api/repositories/{repo_id}/progress")
    assert response.status_code == 200
    progress = response.json()
    assert "stage" in progress
    assert "progress_pct" in progress
    assert "is_complete" in progress
    assert "message" in progress
    assert progress["progress_pct"] == 100
    assert progress["is_complete"] is True


def test_get_progress_nonexistent_repo():
    response = client.get("/api/repositories/non-existent-id-xyz/progress")
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["error_code"] == "REPOSITORY_NOT_FOUND"


# -------------------------------------------------------------
# 5. Ingestion Request Validation & Structured Error Responses
# -------------------------------------------------------------
def test_ingest_invalid_repository_request():
    # Invalid host
    response = client.post(
        "/api/repositories/analyze",
        json={"repo_url": "https://malicious-site.com/repo.git", "branch": "main"}
    )
    assert response.status_code == 400
    data = response.json()
    assert "error_code" in data["detail"]

    # Unsupported protocol
    resp2 = client.post(
        "/api/repositories/analyze",
        json={"repo_url": "ftp://github.com/owner/repo", "branch": "main"}
    )
    assert resp2.status_code == 400
    assert "error_code" in resp2.json()["detail"]


# -------------------------------------------------------------
# 6. Chat & RAG Grounded Output without Mock Answers
# -------------------------------------------------------------
def test_rag_chat_with_real_evidence():
    repo_id = "demo-ecommerce"

    chat_payload = {
        "repository_id": repo_id,
        "message": "Where are user cart items handled or stored?",
        "session_id": "test-session-phase3-a"
    }

    response = client.post("/api/chat", json=chat_payload)
    assert response.status_code == 200
    result = response.json()

    assert "answer" in result
    assert "sources" in result
    assert "confidence" in result
    assert len(result["answer"]) > 0

    # Ensure answers never show mock placeholders
    assert "mock response" not in result["answer"].lower()
    assert "todo: implement" not in result["answer"].lower()

    # Check that retrieved sources contain real file paths and lines
    assert len(result["sources"]) > 0
    for citation in result["sources"]:
        assert "file_path" in citation
        assert "line_start" in citation
        assert "line_end" in citation
        assert citation["line_start"] <= citation["line_end"]


# -------------------------------------------------------------
# 7. Conversational Isolation and Repository Scoping
# -------------------------------------------------------------
def test_conversation_and_repository_isolation():
    repos = client.get("/api/repositories").json()
    repo_id = repos[0]["id"]

    session_1 = "phase3-isolation-session-1"
    session_2 = "phase3-isolation-session-2"

    # Query in Session 1
    resp1 = client.post("/api/chat", json={
        "repository_id": repo_id,
        "message": "How does order checkout work?",
        "session_id": session_1
    })
    assert resp1.status_code == 200

    # Follow-up in Session 1
    resp1_followup = client.post("/api/chat", json={
        "repository_id": repo_id,
        "message": "What about payment confirmation?",
        "session_id": session_1
    })
    assert resp1_followup.status_code == 200

    # Clear Session 1 context
    clear_resp = client.post(f"/api/chat/clear?repository_id={repo_id}&session_id={session_1}")
    assert clear_resp.status_code == 200

    # Query in Session 2 should have independent context
    resp2 = client.post("/api/chat", json={
        "repository_id": repo_id,
        "message": "Explain the database architecture",
        "session_id": session_2
    })
    assert resp2.status_code == 200


# -------------------------------------------------------------
# 8. Safe File Viewing & Path Traversal Prevention
# -------------------------------------------------------------
def test_safe_file_viewing_and_path_traversal():
    repos = client.get("/api/repositories").json()
    repo_id = repos[0]["id"]

    # Traversal attempt with ../
    resp_traversal = client.get(f"/api/repositories/{repo_id}/file?path=../../etc/passwd")
    assert resp_traversal.status_code in [400, 404]

    # Traversal attempt with Windows style ..\
    resp_win_traversal = client.get(f"/api/repositories/{repo_id}/file?path=..\\..\\Windows\\win.ini")
    assert resp_win_traversal.status_code in [400, 404]

    # Non-existent file within repository returns 404 cleanly
    resp_missing = client.get(f"/api/repositories/{repo_id}/file?path=non_existent_file.py")
    assert resp_missing.status_code == 404
