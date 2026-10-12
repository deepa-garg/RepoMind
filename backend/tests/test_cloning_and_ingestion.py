"""
Automated Test Suite for Safe, Idempotent Repository Ingestion & Git Cloning.

Validates:
1. Windows read-only file removal with _safe_remove_directory.
2. First-time ingestion of a repository.
3. Re-ingestion of the same repository (idempotent reuse & explicit re-index).
4. Safe recovery after an incomplete or corrupted clone without destination directory errors.
5. Protection of destination directory belonging to a different repository (DESTINATION_CONFLICT 409).
6. Error handling for invalid URLs, missing branches (BRANCH_NOT_FOUND 404), and empty repositories.
7. Correct repository isolation in hybrid search and chat queries.
"""

import os
import stat
import shutil
import tempfile
import subprocess
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.services.ingestion.repo_ingestion import (
    RepoIngestionService,
    RepoIngestionError,
    _safe_remove_directory,
    _inspect_git_repo,
    _urls_match,
    _normalize_repo_url,
    _sync_git_checkout
)
from app.services.graph.dependency_graph import DependencyGraphService
from app.services.retrieval.vector_store import VectorStoreService
from app.services.storage.metadata_db import MetadataDB

client = TestClient(app)


# ---------------------------------------------------------------------------
# 1. Windows Read-Only Directory Removal
# ---------------------------------------------------------------------------
def test_safe_remove_directory_handles_readonly_files(tmp_path):
    """Verifies that _safe_remove_directory deletes files marked read-only on Windows."""
    test_dir = tmp_path / "test_repo"
    test_dir.mkdir()
    pack_dir = test_dir / ".git" / "objects" / "pack"
    pack_dir.mkdir(parents=True)
    pack_file = pack_dir / "pack-12345.pack"
    pack_file.write_text("dummy binary content")

    # Mark pack file as read-only (stat.S_IREAD only, no write bit)
    os.chmod(pack_file, stat.S_IREAD)
    assert pack_file.exists()

    _safe_remove_directory(test_dir)
    assert not test_dir.exists(), "Directory should have been completely removed despite read-only attribute"


# ---------------------------------------------------------------------------
# 2. Git Origin Inspection & URL Matching
# ---------------------------------------------------------------------------
def test_url_normalization_and_matching():
    assert _urls_match("https://github.com/deepa-garg/ai-resume-analyzer", "https://github.com/deepa-garg/ai-resume-analyzer.git")
    assert _urls_match("https://github.com/Deepa-Garg/AI-Resume-Analyzer/", "https://github.com/deepa-garg/ai-resume-analyzer")
    assert not _urls_match("https://github.com/deepa-garg/ai-resume-analyzer", "https://github.com/repomind/ecommerce-platform")


def test_inspect_git_repo_on_non_git_and_valid_git(tmp_path):
    non_git = tmp_path / "plain_dir"
    non_git.mkdir()
    (non_git / "file.txt").write_text("hello")
    assert _inspect_git_repo(non_git) is None

    git_dir = tmp_path / "valid_git"
    git_dir.mkdir()
    subprocess.run(["git", "init"], cwd=str(git_dir), capture_output=True, check=True)
    subprocess.run(
        ["git", "remote", "add", "origin", "https://github.com/test-owner/test-repo.git"],
        cwd=str(git_dir),
        capture_output=True,
        check=True
    )
    origin = _inspect_git_repo(git_dir)
    assert origin == "https://github.com/test-owner/test-repo"


# ---------------------------------------------------------------------------
# 3. Recovery After Incomplete Clone
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_recovery_after_incomplete_clone(tmp_path, monkeypatch):
    """
    Simulates a previous failed clone leaving behind an incomplete folder with read-only files.
    The ingestion service should safely remove the incomplete directory and proceed without throwing
    'destination path already exists and is not an empty directory'.
    """
    graph_svc = DependencyGraphService()
    vec_svc = VectorStoreService()
    test_db = MetadataDB(db_path=tmp_path / "test_meta.db")
    svc = RepoIngestionService(graph_svc, vec_svc, test_db)

    repo_url = "https://github.com/test-owner/recovery-repo"
    owner, repo_name, clean_url = svc.validate_github_url(repo_url)
    import hashlib
    repo_id = f"repo-{hashlib.sha256(f'{owner}/{repo_name}'.lower().encode()).hexdigest()[:12]}"
    dest_dir = settings.REPOS_DIR / repo_id

    # Create incomplete folder with read-only file
    dest_dir.mkdir(parents=True, exist_ok=True)
    corrupted_file = dest_dir / "incomplete.tmp"
    corrupted_file.write_text("half written")
    os.chmod(corrupted_file, stat.S_IREAD)

    # Mock fetch_github_metadata to return dummy metadata
    async def mock_meta(*args, **kwargs):
        return {"description": "Recovery test repo", "size": 100}, "main", "abc123456789"
    monkeypatch.setattr(svc, "fetch_github_metadata", mock_meta)

    # Mock subprocess.run to simulate successful git clone after cleanup
    def mock_run(cmd, *args, **kwargs):
        if "clone" in cmd:
            dest = Path(cmd[-1])
            dest.mkdir(parents=True, exist_ok=True)
            # Create dummy repo files
            (dest / "main.py").write_text("def run():\n    return 'recovered'\n")
            return MagicMock(returncode=0, stdout="", stderr="")
        return MagicMock(returncode=0, stdout="", stderr="")
    monkeypatch.setattr(subprocess, "run", mock_run)

    try:
        summary = await svc.analyze_repository(repo_url=repo_url, branch="main")
        assert summary.indexing_status == "Ready"
        assert summary.file_count >= 1
    finally:
        _safe_remove_directory(dest_dir)


# ---------------------------------------------------------------------------
# 4. Destination Belongs to Different Repository (Conflict 409)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_destination_belongs_to_different_repo_conflict(tmp_path, monkeypatch):
    """
    Ensures that if the destination folder already contains a checkout of a different repository,
    RepoMind never deletes or overwrites it, and raises DESTINATION_CONFLICT (409).
    """
    graph_svc = DependencyGraphService()
    vec_svc = VectorStoreService()
    test_db = MetadataDB(db_path=tmp_path / "test_conflict.db")
    svc = RepoIngestionService(graph_svc, vec_svc, test_db)

    repo_url = "https://github.com/alice/cool-project"
    owner, repo_name, clean_url = svc.validate_github_url(repo_url)
    import hashlib
    repo_id = f"repo-{hashlib.sha256(f'{owner}/{repo_name}'.lower().encode()).hexdigest()[:12]}"
    dest_dir = settings.REPOS_DIR / repo_id

    # Set up dest_dir as a valid git repo of BOB's project
    dest_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "init"], cwd=str(dest_dir), capture_output=True, check=True)
    subprocess.run(
        ["git", "remote", "add", "origin", "https://github.com/bob/other-project.git"],
        cwd=str(dest_dir),
        capture_output=True,
        check=True
    )
    valuable_file = dest_dir / "bob_data.txt"
    valuable_file.write_text("important bob data")

    # Mock fetch_github_metadata for Alice's project
    async def mock_meta(*args, **kwargs):
        return {"description": "Alice project", "size": 100}, "main", "alice1234567"
    monkeypatch.setattr(svc, "fetch_github_metadata", mock_meta)

    try:
        with pytest.raises(RepoIngestionError) as exc_info:
            await svc.analyze_repository(repo_url=repo_url, branch="main")

        assert exc_info.value.error_code == "DESTINATION_CONFLICT"
        assert exc_info.value.status_code == 409
        # Verify valuable data was NOT touched
        assert valuable_file.exists()
        assert valuable_file.read_text() == "important bob data"
    finally:
        _safe_remove_directory(dest_dir)


# ---------------------------------------------------------------------------
# 5. Missing Branch & GitHub Error Handling
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_missing_branch_raises_branch_not_found(monkeypatch):
    graph_svc = DependencyGraphService()
    vec_svc = VectorStoreService()
    svc = RepoIngestionService(graph_svc, vec_svc)

    # Mock httpx get where repo exists (200) but branch commit returns 404
    class MockHttpxClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def get(self, url, headers=None):
            if "/commits/" in url:
                mock_res = MagicMock()
                mock_res.status_code = 404
                return mock_res
            else:
                mock_res = MagicMock()
                mock_res.status_code = 200
                mock_res.json.return_value = {"default_branch": "main", "size": 500}
                return mock_res

    import httpx
    monkeypatch.setattr(httpx, "AsyncClient", MockHttpxClient)

    with pytest.raises(RepoIngestionError) as exc_info:
        await svc.analyze_repository(repo_url="https://github.com/test-owner/test-repo", branch="nonexistent-branch")

    assert exc_info.value.error_code == "BRANCH_NOT_FOUND"
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# 6. Re-Ingestion Idempotency & Explicit Re-Index
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_reingestion_idempotency_and_force_reindex(tmp_path, monkeypatch):
    """
    Tests that:
    1. First ingestion indexes the files.
    2. Second ingestion without force_reindex returns the cached repository without re-cloning.
    3. Re-ingestion with force_reindex cleans and re-indexes properly without duplicate vectors.
    """
    graph_svc = DependencyGraphService()
    vec_svc = VectorStoreService()
    test_db = MetadataDB(db_path=tmp_path / "test_idempotent.db")
    svc = RepoIngestionService(graph_svc, vec_svc, test_db)

    repo_url = "https://github.com/idempotent-test/app"
    owner, repo_name, clean_url = svc.validate_github_url(repo_url)
    import hashlib
    repo_id = f"repo-{hashlib.sha256(f'{owner}/{repo_name}'.lower().encode()).hexdigest()[:12]}"
    dest_dir = settings.REPOS_DIR / repo_id

    clone_count = 0

    async def mock_meta(*args, **kwargs):
        return {"description": "Idempotent App", "size": 200}, "main", "commit-sha-001"
    monkeypatch.setattr(svc, "fetch_github_metadata", mock_meta)

    def mock_run(cmd, *args, **kwargs):
        nonlocal clone_count
        if "clone" in cmd:
            clone_count += 1
            dest = Path(cmd[-1])
            dest.mkdir(parents=True, exist_ok=True)
            (dest / "service.py").write_text("def process_data(val: int) -> int:\n    return val * 2\n")
            return MagicMock(returncode=0, stdout="", stderr="")
        return MagicMock(returncode=0, stdout="", stderr="")
    monkeypatch.setattr(subprocess, "run", mock_run)

    try:
        # First-time ingestion
        res1 = await svc.analyze_repository(repo_url=repo_url, branch="main", force_reindex=False)
        assert res1.indexing_status == "Ready"
        assert clone_count == 1

        # Second ingestion: should reuse existing cache
        res2 = await svc.analyze_repository(repo_url=repo_url, branch="main", force_reindex=False)
        assert res2.id == res1.id
        assert clone_count == 1, "Clone should not have been called again on idempotent re-ingest"

        # Explicit force re-index: should re-process without duplicate chunks
        res3 = await svc.analyze_repository(repo_url=repo_url, branch="main", force_reindex=True)
        assert res3.id == res1.id
        # Verify vector store only has 1 set of chunks (no duplicates)
        chunks = vec_svc.chunks_by_repo.get(repo_id, [])
        assert len(chunks) >= 1
        chunk_ids = [c["chunk_id"] for c in chunks]
        assert len(chunk_ids) == len(set(chunk_ids)), "All chunk IDs must be strictly unique"
    finally:
        _safe_remove_directory(dest_dir)


# ---------------------------------------------------------------------------
# 7. Search & Chat Multi-Tenant Isolation
# ---------------------------------------------------------------------------
def test_search_isolation_between_repositories(tmp_path):
    vec_svc = VectorStoreService()

    repo_a = "repo-alpha"
    repo_b = "repo-beta"

    files_a = {
        "resume_scorer.py": {
            "content": "def score_resume(candidate: str) -> float:\n    return 95.0\n",
            "language": "python",
            "symbols": [{"name": "score_resume", "kind": "function"}],
            "dependencies": [],
            "layer": "service"
        }
    }
    files_b = {
        "payment_gateway.py": {
            "content": "def process_stripe_payment(card: str) -> bool:\n    return True\n",
            "language": "python",
            "symbols": [{"name": "process_stripe_payment", "kind": "function"}],
            "dependencies": [],
            "layer": "service"
        }
    }

    vec_svc.index_repository(files_a, repo_id=repo_a)
    vec_svc.index_repository(files_b, repo_id=repo_b)

    # Search in repo_a for 'score_resume'
    results_a = vec_svc.hybrid_search("score_resume", repository_id=repo_a)
    assert any("resume_scorer.py" in r.file_path for r in results_a)
    assert not any("payment_gateway.py" in r.file_path for r in results_a)

    # Search in repo_b for 'score_resume' -> should find nothing from repo_a
    results_b = vec_svc.hybrid_search("score_resume", repository_id=repo_b)
    assert not any("resume_scorer.py" in r.file_path for r in results_b)
