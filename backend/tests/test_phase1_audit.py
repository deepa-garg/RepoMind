"""
Comprehensive Verification Test Suite for RepoMind Phase 1.
Validates URL validation, GitHub error handling, secret file exclusion,
ZIP path traversal defense, multi-repository isolation, persistence, and safe deletion.
"""

import io
import zipfile
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.ingestion.repo_ingestion import RepoIngestionService, RepoIngestionError
from app.services.graph.dependency_graph import DependencyGraphService
from app.services.retrieval.vector_store import VectorStoreService
from app.services.storage.metadata_db import MetadataDB

client = TestClient(app)


# -------------------------------------------------------------
# 1. URL Validation & Host Security Tests
# -------------------------------------------------------------
def test_valid_and_invalid_github_urls():
    ingestion = RepoIngestionService(DependencyGraphService(), VectorStoreService())

    # Valid URLs
    owner, repo, clean_url = ingestion.validate_github_url("https://github.com/psf/requests")
    assert owner == "psf"
    assert repo == "requests"
    assert clean_url == "https://github.com/psf/requests"

    owner, repo, clean_url = ingestion.validate_github_url("https://github.com/torvalds/linux.git")
    assert owner == "torvalds"
    assert repo == "linux"

    # Unsupported hosts
    with pytest.raises(RepoIngestionError) as exc_info:
        ingestion.validate_github_url("https://gitlab.com/owner/repo")
    assert exc_info.value.error_code == "UNSUPPORTED_HOST"

    with pytest.raises(RepoIngestionError) as exc_info:
        ingestion.validate_github_url("http://169.254.169.254/latest/meta-data")
    assert exc_info.value.error_code == "UNSUPPORTED_HOST"

    # Unsupported protocol
    with pytest.raises(RepoIngestionError) as exc_info:
        ingestion.validate_github_url("ftp://github.com/owner/repo")
    assert exc_info.value.error_code == "UNSUPPORTED_PROTOCOL"

    # Malformed URL
    with pytest.raises(RepoIngestionError) as exc_info:
        ingestion.validate_github_url("https://github.com/only-owner")
    assert exc_info.value.error_code == "MALFORMED_URL"

    # Path traversal in URL
    with pytest.raises(RepoIngestionError) as exc_info:
        ingestion.validate_github_url("https://github.com/owner/../repo")
    assert exc_info.value.error_code in ["INVALID_REPOSITORY_NAME", "PATH_TRAVERSAL"]


def test_api_analyze_rejects_invalid_url():
    response = client.post("/api/repositories/analyze", json={
        "repo_url": "https://malicious-site.com/evil/repo"
    })
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert data["detail"]["error_code"] == "UNSUPPORTED_HOST"


# -------------------------------------------------------------
# 2. GitHub Access, Error Handling & Authentication Tests
# -------------------------------------------------------------
@pytest.mark.asyncio
async def test_github_api_404_not_found():
    ingestion = RepoIngestionService(DependencyGraphService(), VectorStoreService())
    with pytest.raises(RepoIngestionError) as exc_info:
        await ingestion.fetch_github_metadata("nonexistent-repomind-user-99999", "nonexistent-repo-12345")
    assert exc_info.value.error_code == "REPOSITORY_NOT_FOUND"
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_github_api_403_rate_limit_handling():
    ingestion = RepoIngestionService(DependencyGraphService(), VectorStoreService())

    # Mock 403 rate limit response
    mock_resp = MagicMock()
    mock_resp.status_code = 403
    mock_resp.headers = {"x-ratelimit-remaining": "0"}

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        with pytest.raises(RepoIngestionError) as exc_info:
            await ingestion.fetch_github_metadata("testowner", "testrepo")
        assert exc_info.value.error_code == "RATE_LIMIT_EXCEEDED"
        assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_github_api_401_unauthorized_token():
    ingestion = RepoIngestionService(DependencyGraphService(), VectorStoreService())

    mock_resp = MagicMock()
    mock_resp.status_code = 401

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        with pytest.raises(RepoIngestionError) as exc_info:
            await ingestion.fetch_github_metadata("testowner", "testrepo")
        assert exc_info.value.error_code == "UNAUTHORIZED_TOKEN"
        assert exc_info.value.status_code == 401


# -------------------------------------------------------------
# 3. Secret-File Exclusion & ZIP Path Traversal Tests
# -------------------------------------------------------------
def test_sensitive_file_exclusion():
    ingestion = RepoIngestionService(DependencyGraphService(), VectorStoreService())
    assert ingestion._is_sensitive_file(".env") is True
    assert ingestion._is_sensitive_file(".env.production") is True
    assert ingestion._is_sensitive_file("server.key") is True
    assert ingestion._is_sensitive_file("cert.pem") is True
    assert ingestion._is_sensitive_file("id_rsa") is True
    assert ingestion._is_sensitive_file("id_ed25519") is True
    assert ingestion._is_sensitive_file("credentials.json") is True
    assert ingestion._is_sensitive_file("client_secret_oauth.json") is True
    # Safe files
    assert ingestion._is_sensitive_file("main.py") is False
    assert ingestion._is_sensitive_file("AuthService.ts") is False
    assert ingestion._is_sensitive_file("package.json") is False


def test_zip_archive_ingestion_and_path_traversal_defense():
    ingestion = RepoIngestionService(DependencyGraphService(), VectorStoreService())

    # Create a safe zip archive in-memory
    safe_buf = io.BytesIO()
    with zipfile.ZipFile(safe_buf, "w") as z:
        z.writestr("src/calc.py", "def add(a, b):\n    return a + b\n")
        z.writestr(".env", "SECRET_KEY=leak")
        z.writestr("keys/id_rsa", "PRIVATE_KEY")
    safe_bytes = safe_buf.getvalue()

    summary = ingestion.analyze_zip_archive(safe_bytes, "test-calc.zip")
    assert summary.file_count == 1  # Only calc.py, .env and id_rsa excluded!
    assert "src/calc.py" in summary.tree["children"][0]["children"][0]["path"]

    # Test ZIP path traversal attack defense
    malicious_buf = io.BytesIO()
    with zipfile.ZipFile(malicious_buf, "w") as z:
        z.writestr("../../../evil.py", "malicious_code = True")
    malicious_bytes = malicious_buf.getvalue()

    with pytest.raises(RepoIngestionError) as exc_info:
        ingestion.analyze_zip_archive(malicious_bytes, "exploit.zip")
    assert exc_info.value.error_code == "PATH_TRAVERSAL"


# -------------------------------------------------------------
# 4. Strict Multi-Repository Isolation Tests
# -------------------------------------------------------------
def test_multi_repository_isolation():
    graph_svc = DependencyGraphService()
    vector_svc = VectorStoreService()
    db = MetadataDB()

    repo_a_files = {
        "src/auth.py": {
            "content": "def authenticate(user):\n    return True\n",
            "layer": "service",
            "language": "python",
            "symbols": [{"name": "authenticate", "kind": "function", "line_start": 1, "line_end": 2, "calls": []}],
            "dependencies": []
        }
    }

    repo_b_files = {
        "src/billing.py": {
            "content": "def charge_card(amount):\n    return 'paid'\n",
            "layer": "service",
            "language": "python",
            "symbols": [{"name": "charge_card", "kind": "function", "line_start": 1, "line_end": 2, "calls": []}],
            "dependencies": []
        }
    }

    # Index both repositories
    vector_svc.index_repository(repo_a_files, repo_id="repo-alpha")
    vector_svc.index_repository(repo_b_files, repo_id="repo-beta")
    graph_svc.build_from_repo_data(repo_a_files, repo_id="repo-alpha")
    graph_svc.build_from_repo_data(repo_b_files, repo_id="repo-beta")

    # 1. Querying Repo A must NEVER retrieve Repo B's code
    results_a = vector_svc.hybrid_search("charge card billing", repository_id="repo-alpha")
    assert len(results_a) == 0

    results_b = vector_svc.hybrid_search("charge card billing", repository_id="repo-beta")
    assert len(results_b) > 0
    assert any("charge_card" in r.symbol_name for r in results_b)

    # 2. Querying Repo B must NEVER retrieve Repo A's code
    results_b_auth = vector_svc.hybrid_search("authenticate user", repository_id="repo-beta")
    assert len(results_b_auth) == 0

    # 3. Deleting Repo A must NOT affect Repo B
    vector_svc.delete_repository_vectors("repo-alpha")
    assert len(vector_svc.chunks_by_repo.get("repo-alpha", [])) == 0
    # Repo B is still intact
    results_b_after = vector_svc.hybrid_search("charge_card", repository_id="repo-beta")
    assert len(results_b_after) > 0


# -------------------------------------------------------------
# 5. Storage Persistence & File-Content Path Traversal Tests
# -------------------------------------------------------------
def test_sqlite_persistence_and_safe_deletion():
    db = MetadataDB()

    test_repo = {
        "id": "test-persist-1",
        "name": "persist-test",
        "owner": "tester",
        "branch": "main",
        "commit_sha": "abc1234",
        "description": "Persistence test repo",
        "file_count": 1,
        "is_demo": False
    }
    test_files = {
        "main.py": {
            "content": "print('hello')",
            "layer": "service",
            "language": "python",
            "symbols": [],
            "dependencies": []
        }
    }

    db.save_repository(test_repo, test_files)

    # Verify retrieval from fresh database connection
    retrieved = db.get_repository("test-persist-1")
    assert retrieved is not None
    assert retrieved["name"] == "persist-test"
    assert retrieved["commit_sha"] == "abc1234"

    files = db.get_repository_files("test-persist-1")
    assert "main.py" in files
    assert files["main.py"]["content"] == "print('hello')"

    # Verify safe deletion
    deleted = db.delete_repository("test-persist-1")
    assert deleted is True
    assert db.get_repository("test-persist-1") is None
    assert len(db.get_repository_files("test-persist-1")) == 0


def test_file_content_endpoint_path_traversal_defense():
    # Attempting to traverse using ../
    response = client.get("/api/repositories/demo-ecommerce/file-content?path=../../etc/passwd")
    assert response.status_code == 400
    assert response.json()["detail"]["error_code"] == "PATH_TRAVERSAL"
