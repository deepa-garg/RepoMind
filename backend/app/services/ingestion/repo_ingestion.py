"""
Repository Ingestion Pipeline for RepoMind.
Orchestrates secure GitHub fetching, branch & commit SHA inspection, sensitive file filtering,
AST parsing, isolated dependency graph construction, and multi-tenant vector indexing.
"""

import os
import re
import stat
import shutil
import zipfile
import subprocess
import hashlib
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse
import httpx

from app.core.config import settings
from app.models.schemas import RepositorySummary, AnalysisProgress
from app.demo.ecommerce_repo import DEMO_REPO_FILES
from app.services.parser.ast_parser import ASTParser
from app.services.graph.dependency_graph import DependencyGraphService
from app.services.retrieval.vector_store import VectorStoreService
from app.services.analysis.health_scorer import HealthScorerService
from app.services.storage.metadata_db import MetadataDB


def _safe_remove_directory(path: Path) -> None:
    """
    Safely and completely removes a directory tree on Windows and POSIX,
    handling Git's read-only files (.git/objects/pack, pack files) by clearing
    the read-only attribute before unlinking.
    """
    if not path.exists():
        return

    def _remove_readonly(func, file_path, exc_info_or_exc):
        try:
            os.chmod(file_path, stat.S_IWRITE | stat.S_IREAD)
            func(file_path)
        except Exception:
            pass

    try:
        shutil.rmtree(str(path), onexc=_remove_readonly)
    except TypeError:
        shutil.rmtree(str(path), onerror=_remove_readonly)
    except Exception:
        pass


def _normalize_repo_url(url: Optional[str]) -> str:
    """Normalizes a Git repository URL for safe, canonical comparison."""
    if not url:
        return ""
    clean = url.strip()
    if clean.endswith(".git"):
        clean = clean[:-4]
    return clean.rstrip("/").lower()


def _inspect_git_repo(dest_dir: Path) -> Optional[str]:
    """
    Inspects dest_dir. If it's a valid git checkout with a configured remote origin,
    returns the normalized origin URL. Otherwise returns None.
    """
    if not dest_dir.exists() or not (dest_dir / ".git").exists():
        return None
    try:
        res = subprocess.run(
            ["git", "-C", str(dest_dir), "config", "--get", "remote.origin.url"],
            capture_output=True,
            text=True,
            timeout=10,
            shell=False
        )
        if res.returncode == 0 and res.stdout.strip():
            return _normalize_repo_url(res.stdout.strip())
    except Exception:
        pass
    return None


def _urls_match(url1: str, url2: str) -> bool:
    """Checks whether two repository URLs point to the same repository."""
    return _normalize_repo_url(url1) == _normalize_repo_url(url2)


def _sync_git_checkout(dest_dir: Path, clean_url: str, branch: str, timeout: int) -> Tuple[bool, str]:
    """
    Synchronizes an existing valid git checkout to the requested branch,
    fetching the latest commit without having to re-clone the entire repository.
    """
    try:
        fetch_cmd = ["git", "-C", str(dest_dir), "fetch", "--depth", "1", "origin", branch]
        f_res = subprocess.run(fetch_cmd, capture_output=True, text=True, timeout=timeout, shell=False)
        if f_res.returncode != 0:
            return False, f_res.stderr or f_res.stdout or "Fetch failed"

        co_cmd = ["git", "-C", str(dest_dir), "checkout", branch]
        c_res = subprocess.run(co_cmd, capture_output=True, text=True, timeout=timeout, shell=False)
        if c_res.returncode != 0:
            co_b_cmd = ["git", "-C", str(dest_dir), "checkout", "-B", branch, f"origin/{branch}"]
            c_res = subprocess.run(co_b_cmd, capture_output=True, text=True, timeout=timeout, shell=False)
            if c_res.returncode != 0:
                return False, c_res.stderr or c_res.stdout or "Checkout failed"

        reset_cmd = ["git", "-C", str(dest_dir), "reset", "--hard", f"origin/{branch}"]
        r_res = subprocess.run(reset_cmd, capture_output=True, text=True, timeout=timeout, shell=False)
        if r_res.returncode != 0:
            return False, r_res.stderr or r_res.stdout or "Reset failed"

        return True, ""
    except subprocess.TimeoutExpired:
        return False, f"Git operation timed out after {timeout}s"
    except Exception as e:
        return False, str(e)


class RepoIngestionError(Exception):
    def __init__(self, error_code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.error_code = error_code
        self.message = message
        self.status_code = status_code


class RepoIngestionService:
    # Sensitive file patterns excluded from indexing
    SENSITIVE_PATTERNS = [
        re.compile(r"^\.env(\..+)?$", re.IGNORECASE),
        re.compile(r"^.*\.(pem|key|pkcs12|pfx|p12|crt|cert|der)$", re.IGNORECASE),
        re.compile(r"^(id_rsa|id_dsa|id_ed25519|id_ecdsa)(\..+)?$", re.IGNORECASE),
        re.compile(r"^.*credentials.*\.json$", re.IGNORECASE),
        re.compile(r"^client_secret.*\.json$", re.IGNORECASE),
        re.compile(r"^.*token.*\.(txt|json)$", re.IGNORECASE),
    ]

    IGNORE_DIRS = {
        ".git", "node_modules", "dist", "build", ".next", "__pycache__",
        "venv", ".venv", ".idea", ".vscode", ".turbo", "target", "vendor",
        ".cache", ".pytest_cache"
    }

    INDEXABLE_EXTENSIONS = {
        "ts": "typescript",
        "tsx": "typescript",
        "js": "javascript",
        "jsx": "javascript",
        "py": "python",
        "sql": "sql",
        "json": "json",
        "md": "markdown",
        "html": "html",
        "css": "css",
        "go": "go",
        "rs": "rust",
        "java": "java",
        "c": "c",
        "cpp": "cpp",
        "sh": "shell",
    }

    def __init__(
        self,
        graph_service: DependencyGraphService,
        vector_store: VectorStoreService,
        db: Optional[MetadataDB] = None
    ):
        self.graph_service = graph_service
        self.vector_store = vector_store
        self.db = db or MetadataDB()
        self.progress_states: Dict[str, AnalysisProgress] = {}

        # Initialize demo repository and warm up SQLite and vectors
        self._init_demo_repo()

    def _init_demo_repo(self):
        repo_id = "demo-ecommerce"
        existing = self.db.get_repository(repo_id)

        files_data = DEMO_REPO_FILES
        self.graph_service.build_from_repo_data(files_data, repo_id=repo_id)

        # Check if already persisted in Qdrant and SQLite to skip redundant neural re-encoding
        self.vector_store._ensure_repo_hydrated(repo_id)
        if existing and len(self.vector_store.chunks_by_repo.get(repo_id, [])) > 0:
            return

        self.vector_store.index_repository(
            files_data,
            repo_id=repo_id,
            repo_url="https://github.com/repomind/ecommerce-platform",
            branch="main",
            commit_sha="demo-sha-9f82d1"
        )
        health = HealthScorerService.calculate_health(files_data)

        func_cnt = 0
        class_cnt = 0
        dep_cnt = 0
        test_cnt = 0

        for path, info in files_data.items():
            if info.get("layer") == "test":
                test_cnt += 1
            dep_cnt += len(info.get("dependencies", []))
            for s in info.get("symbols", []):
                if s["kind"] in ["function", "method"]:
                    func_cnt += 1
                elif s["kind"] in ["class", "interface"]:
                    class_cnt += 1

        summary = RepositorySummary(
            id=repo_id,
            name="ecommerce-platform",
            owner="repomind",
            branch="main",
            commit_sha="demo-sha-9f82d1",
            repo_url="https://github.com/repomind/ecommerce-platform",
            description="Production multi-layer e-commerce backend platform with Auth, Orders, Payments, and Database",
            languages={"TypeScript": 72, "SQL": 15, "Shell": 13},
            file_count=len(files_data),
            function_count=func_cnt,
            class_count=class_cnt,
            dependency_count=dep_cnt,
            test_file_count=test_cnt,
            doc_percentage=health.documentation,
            codebase_health=health,
            is_demo=True,
            indexing_status="Ready",
            analysis_time=existing["analysis_time"] if existing else datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            tree=self._build_file_tree(list(files_data.keys()))
        )

        self.db.save_repository(summary.model_dump(), files_data)
        progress = AnalysisProgress(
            stage="Ready",
            progress_pct=100,
            message="Demo repository indexed and ready",
            is_complete=True,
            repository_id=repo_id
        )
        self.progress_states[repo_id] = progress
        self.db.set_progress(repo_id, "Ready", 100, "Demo repository ready", True)

    def generate_repo_id(self, url: str, branch: Optional[str] = "main") -> str:
        """
        Calculates a deterministic repository ID for a validated repository URL and branch.
        Handles demo repository mapping and public GitHub repositories.
        """
        if not url or url == "https://github.com/repomind/ecommerce-platform":
            return "demo-ecommerce"
        owner, repo_name, _ = self.validate_github_url(url)
        return f"repo-{hashlib.sha256(f'{owner}/{repo_name}'.lower().encode()).hexdigest()[:12]}"

    def validate_github_url(self, url: str) -> Tuple[str, str, str]:
        """
        Validates GitHub repository URL and extracts owner, repo, and clean clone URL.
        Rejects non-github hosts, malformed inputs, and unsafe paths.
        """
        if not url or not isinstance(url, str):
            raise RepoIngestionError("INVALID_URL", "Repository URL cannot be empty.", 400)

        url = url.strip()
        parsed = urlparse(url)

        if parsed.scheme not in ("http", "https"):
            raise RepoIngestionError("UNSUPPORTED_PROTOCOL", f"Protocol '{parsed.scheme}' is unsupported. Use https://", 400)

        netloc = parsed.netloc.lower()
        if netloc != "github.com" and not netloc.endswith(".github.com"):
            raise RepoIngestionError("UNSUPPORTED_HOST", f"Host '{parsed.netloc}' is not supported. Only public GitHub repositories are supported in Phase 1.", 400)

        # Path must be /owner/repo or /owner/repo.git
        clean_path = parsed.path.strip("/")
        parts = [p for p in clean_path.split("/") if p]
        if len(parts) < 2:
            raise RepoIngestionError("MALFORMED_URL", "URL must specify both owner and repository (e.g., https://github.com/owner/repo).", 400)

        owner = parts[0]
        repo = parts[1].replace(".git", "")

        # Validate owner and repo names against safe alphanumeric character set
        name_regex = re.compile(r"^[a-zA-Z0-9_\-\.]+$")
        if not name_regex.match(owner) or not name_regex.match(repo):
            raise RepoIngestionError("INVALID_REPOSITORY_NAME", f"Invalid characters detected in repository name or owner: {owner}/{repo}", 400)

        if ".." in owner or ".." in repo:
            raise RepoIngestionError("PATH_TRAVERSAL", "Path traversal sequences not permitted in repository path.", 400)

        clean_url = f"https://github.com/{owner}/{repo}"
        return owner, repo, clean_url

    def _is_sensitive_file(self, filename: str) -> bool:
        """Determines if a filename matches sensitive patterns (keys, secrets, .env)."""
        base_name = os.path.basename(filename)
        for pattern in self.SENSITIVE_PATTERNS:
            if pattern.match(base_name):
                return True
        return False

    def _calculate_languages(self, files_data: Dict[str, Dict[str, Any]]) -> Dict[str, int]:
        """Calculates authentic language distribution percentages based on indexed files."""
        if not files_data:
            return {}

        lang_counts: Dict[str, int] = {}
        for path in files_data.keys():
            ext = path.split(".")[-1].lower() if "." in path else ""
            lang = self.INDEXABLE_EXTENSIONS.get(ext)
            if lang:
                norm_lang = lang.capitalize()
                lang_counts[norm_lang] = lang_counts.get(norm_lang, 0) + 1

        total = sum(lang_counts.values())
        if total == 0:
            return {"Plain Text": 100}

        sorted_langs = sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        pcts = {k: int(round((v / total) * 100)) for k, v in sorted_langs}
        # Normalize sum to 100
        current_sum = sum(pcts.values())
        if current_sum > 0 and current_sum != 100 and sorted_langs:
            first_lang = sorted_langs[0][0]
            pcts[first_lang] += (100 - current_sum)
        return pcts

    def _build_file_tree(self, file_paths: List[str]) -> Dict[str, Any]:
        """Builds hierarchical file tree dictionary for the frontend explorer."""
        tree: Dict[str, Any] = {"name": "root", "type": "directory", "children": []}

        for path in sorted(file_paths):
            parts = path.split("/")
            current = tree
            for i, part in enumerate(parts):
                is_file = (i == len(parts) - 1)
                existing = next((c for c in current["children"] if c["name"] == part), None)
                if not existing:
                    new_node = {
                        "name": part,
                        "path": "/".join(parts[:i+1]),
                        "type": "file" if is_file else "directory",
                        "children": [] if not is_file else None
                    }
                    current["children"].append(new_node)
                    current = new_node
                else:
                    current = existing

        return tree

    async def fetch_github_metadata(
        self,
        owner: str,
        repo: str,
        branch: Optional[str] = None
    ) -> Tuple[Dict[str, Any], str, str]:
        """
        Queries the GitHub REST API for repository existence, metadata, default branch, and commit SHA.
        Respects GITHUB_TOKEN if configured. Raises clear structured errors for 404, 403, 401.
        """
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": f"RepoMind-Engine/{settings.APP_VERSION}"
        }
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

        api_url = f"{settings.GITHUB_API_BASE}/repos/{owner}/{repo}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.get(api_url, headers=headers)
            except httpx.RequestError as exc:
                raise RepoIngestionError("NETWORK_TIMEOUT", f"Failed to connect to GitHub API: {str(exc)}", 504)

            if res.status_code == 404:
                raise RepoIngestionError(
                    "REPOSITORY_NOT_FOUND",
                    f"Repository '{owner}/{repo}' was not found on GitHub. Verify the URL or verify that it is public.",
                    404
                )
            elif res.status_code == 401:
                raise RepoIngestionError(
                    "UNAUTHORIZED_TOKEN",
                    "Provided GITHUB_TOKEN is invalid or unauthorized.",
                    401
                )
            elif res.status_code == 403:
                rate_limit_remaining = res.headers.get("x-ratelimit-remaining", "0")
                if rate_limit_remaining == "0":
                    raise RepoIngestionError(
                        "RATE_LIMIT_EXCEEDED",
                        "GitHub API rate limit exceeded. Set a GITHUB_TOKEN in backend environment to increase quota.",
                        429
                    )
                raise RepoIngestionError(
                    "ACCESS_FORBIDDEN",
                    f"Access forbidden to '{owner}/{repo}'. Explicit authorization required.",
                    403
                )
            elif res.status_code != 200:
                raise RepoIngestionError(
                    "GITHUB_API_ERROR",
                    f"GitHub API returned unexpected status {res.status_code}: {res.text}",
                    res.status_code
                )

            metadata = res.json()
            default_branch = branch or metadata.get("default_branch", "main")

            # Check if repository is empty
            if metadata.get("size", 0) == 0:
                raise RepoIngestionError("EMPTY_REPOSITORY", f"Repository '{owner}/{repo}' is empty.", 400)

            # Fetch latest commit SHA for branch
            commit_url = f"{settings.GITHUB_API_BASE}/repos/{owner}/{repo}/commits/{default_branch}"
            commit_sha = ""
            try:
                c_res = await client.get(commit_url, headers=headers)
                if c_res.status_code == 200:
                    commit_sha = c_res.json().get("sha", "")[:12]
                elif c_res.status_code == 404:
                    raise RepoIngestionError(
                        "BRANCH_NOT_FOUND",
                        f"Branch '{default_branch}' was not found in repository '{owner}/{repo}'.",
                        404
                    )
            except RepoIngestionError:
                raise
            except Exception:
                pass

            return metadata, default_branch, commit_sha

    async def analyze_repository(
        self,
        repo_url: Optional[str] = None,
        branch: str = "main",
        is_demo: bool = False,
        force_reindex: bool = False
    ) -> RepositorySummary:
        """
        Executes end-to-end ingestion pipeline with real stages:
        Connecting -> Cloning or Fetching -> Scanning -> Parsing -> Indexing -> Ready.
        """
        # If demo requested explicitly, return clean demo repository
        if is_demo or not repo_url or repo_url == "https://github.com/repomind/ecommerce-platform":
            self._init_demo_repo()
            demo_record = self.db.get_repository("demo-ecommerce")
            return RepositorySummary(**demo_record)

        # 1. Validation
        owner, repo_name, clean_url = self.validate_github_url(repo_url)
        # Deterministic repository ID based on owner and name
        repo_id = f"repo-{hashlib.sha256(f'{owner}/{repo_name}'.lower().encode()).hexdigest()[:12]}"

        try:
            # Stage 1: Connecting
            self._update_progress(repo_id, "Connecting", 10, f"Connecting to GitHub API for {owner}/{repo_name}...")

            # 2. Fetch metadata from GitHub REST API
            metadata, resolved_branch, commit_sha = await self.fetch_github_metadata(owner, repo_name, branch)

            # Check existing cached repository to avoid duplicate work if commit SHA matches
            if not force_reindex:
                existing = self.db.get_repository(repo_id)
                if existing and existing.get("indexing_status") == "Ready" and existing.get("branch") == resolved_branch:
                    if (commit_sha and existing.get("commit_sha") == commit_sha) or (not commit_sha and existing.get("file_count", 0) > 0):
                        existing_files = self.db.get_repository_files(repo_id)
                        if existing_files:
                            # Warm memory if restarting
                            if repo_id not in self.graph_service.graphs:
                                self.graph_service.build_from_repo_data(existing_files, repo_id=repo_id)
                            if repo_id not in self.vector_store.chunks_by_repo:
                                self.vector_store.index_repository(
                                    existing_files,
                                    repo_id=repo_id,
                                    repo_url=clean_url,
                                    branch=resolved_branch,
                                    commit_sha=existing.get("commit_sha") or commit_sha
                                )
                            self._update_progress(repo_id, "Ready", 100, "Repository up to date with latest commit", is_complete=True)
                            return RepositorySummary(**existing)

            dest_dir = settings.REPOS_DIR / repo_id

            # Determine checkout / clone strategy safely and idempotently
            need_clone = True
            if dest_dir.exists():
                existing_origin = _inspect_git_repo(dest_dir)
                if existing_origin:
                    # Directory contains a valid git repository
                    if not _urls_match(existing_origin, clean_url):
                        # Destination belongs to a DIFFERENT repository: never overwrite or delete it!
                        raise RepoIngestionError(
                            "DESTINATION_CONFLICT",
                            f"Destination directory '{dest_dir.name}' belongs to a different repository ('{existing_origin}'). Ingestion aborted to protect existing data.",
                            409
                        )
                    # Directory is already a valid checkout of the requested repository
                    self._update_progress(repo_id, "Cloning or Fetching", 30, f"Updating existing checkout of branch '{resolved_branch}'...")
                    sync_ok, sync_err = _sync_git_checkout(dest_dir, clean_url, resolved_branch, settings.GIT_TIMEOUT_SECONDS)
                    if sync_ok:
                        need_clone = False
                    else:
                        # Sync failed (e.g. shallow clone or corrupted state); recover safely by removing and cloning fresh
                        _safe_remove_directory(dest_dir)
                        need_clone = True
                else:
                    # Directory exists but is NOT a valid git repository (e.g. leftover from an interrupted clone)
                    # Recover safely using Windows-safe removal
                    _safe_remove_directory(dest_dir)
                    need_clone = True

            if need_clone:
                self._update_progress(repo_id, "Cloning or Fetching", 30, f"Cloning branch '{resolved_branch}' (commit {commit_sha or 'HEAD'})...")
                clone_cmd = [
                    "git", "clone",
                    "--depth", "1",
                    "--branch", resolved_branch,
                    "--single-branch",
                    clean_url,
                    str(dest_dir)
                ]
                try:
                    res = subprocess.run(
                        clone_cmd,
                        capture_output=True,
                        text=True,
                        timeout=settings.GIT_TIMEOUT_SECONDS,
                        shell=False
                    )
                    if res.returncode != 0:
                        _safe_remove_directory(dest_dir)
                        err_detail = res.stderr or res.stdout or "Git clone failed"
                        raise RepoIngestionError("CLONE_FAILED", f"Failed to clone repository: {err_detail.strip()}", 400)
                except subprocess.TimeoutExpired:
                    _safe_remove_directory(dest_dir)
                    raise RepoIngestionError("TIMEOUT", f"Git clone operation timed out after {settings.GIT_TIMEOUT_SECONDS}s.", 504)
                except Exception as e:
                    _safe_remove_directory(dest_dir)
                    if isinstance(e, RepoIngestionError):
                        raise
                    raise RepoIngestionError("CLONE_ERROR", f"Error during git clone: {str(e)}", 500)

            # Stage 3: Scanning
            self._update_progress(repo_id, "Scanning", 50, "Scanning files and filtering sensitive assets...")

            files_data: Dict[str, Dict[str, Any]] = {}
            total_files_scanned = 0
            total_size_bytes = 0

            for root, dirs, files in os.walk(dest_dir):
                dirs[:] = [d for d in dirs if d not in self.IGNORE_DIRS]
                for file in files:
                    # Sensitive credentials filter
                    if self._is_sensitive_file(file):
                        continue

                    ext = file.split(".")[-1].lower() if "." in file else ""
                    if ext in self.INDEXABLE_EXTENSIONS:
                        full_path = Path(root) / file
                        try:
                            file_size = full_path.stat().st_size
                        except OSError:
                            continue

                        # Limit single file size
                        if file_size > settings.MAX_FILE_SIZE_BYTES:
                            continue

                        total_size_bytes += file_size
                        if total_size_bytes > (settings.MAX_REPO_SIZE_MB * 1024 * 1024):
                            break

                        rel_path = str(full_path.relative_to(dest_dir)).replace("\\", "/")
                        # Prevent directory traversal
                        if ".." in rel_path:
                            continue

                        try:
                            content = full_path.read_text(encoding="utf-8", errors="ignore")
                        except Exception:
                            continue

                        files_data[rel_path] = {
                            "content": content,
                            "language": self.INDEXABLE_EXTENSIONS[ext],
                            "symbols": [],
                            "dependencies": [],
                            "dependents": [],
                            "layer": "service"
                        }
                        total_files_scanned += 1
                        if total_files_scanned >= settings.MAX_FILES_PER_REPO:
                            break

                if total_files_scanned >= settings.MAX_FILES_PER_REPO:
                    break

            if not files_data:
                # Clean up and report actual empty state - NEVER fall back to demo files!
                _safe_remove_directory(dest_dir)
                raise RepoIngestionError(
                    "NO_INDEXABLE_FILES",
                    "Repository contains no supported source code files or all files were excluded by safety filters.",
                    400
                )

            # Stage 4: Parsing AST
            self._update_progress(repo_id, "Parsing", 75, f"Parsing AST symbols and imports across {len(files_data)} files...")

            for rel_path, info in files_data.items():
                content = info["content"]
                lang = info["language"]
                symbols, file_info = ASTParser.parse_file(rel_path, content, lang)
                info["layer"] = file_info.layer
                info["symbols"] = [s.model_dump() for s in symbols]
                info["dependencies"] = file_info.imports

            # Stage 5: Indexing
            self._update_progress(repo_id, "Indexing", 90, "Building dependency graph and vector embeddings...")

            self.graph_service.build_from_repo_data(files_data, repo_id=repo_id)
            self.vector_store.index_repository(
                files_data,
                repo_id=repo_id,
                repo_url=clean_url,
                branch=resolved_branch,
                commit_sha=commit_sha
            )
            health = HealthScorerService.calculate_health(files_data)

            func_cnt = sum(len([s for s in info.get("symbols", []) if s.get("kind") in ["function", "method"]]) for info in files_data.values())
            class_cnt = sum(len([s for s in info.get("symbols", []) if s.get("kind") in ["class", "interface"]]) for info in files_data.values())
            dep_cnt = sum(len(info.get("dependencies", [])) for info in files_data.values())
            test_cnt = sum(1 for info in files_data.values() if info.get("layer") == "test")
            languages = self._calculate_languages(files_data)

            summary = RepositorySummary(
                id=repo_id,
                name=repo_name,
                owner=owner,
                branch=resolved_branch,
                commit_sha=commit_sha,
                repo_url=clean_url,
                description=metadata.get("description") or f"Analyzed repository {owner}/{repo_name}",
                languages=languages,
                file_count=len(files_data),
                function_count=func_cnt,
                class_count=class_cnt,
                dependency_count=dep_cnt,
                test_file_count=test_cnt,
                doc_percentage=health.documentation,
                codebase_health=health,
                is_demo=False,
                indexing_status="Ready",
                analysis_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                tree=self._build_file_tree(list(files_data.keys()))
            )

            # Atomic persistence to SQLite
            self.db.save_repository(summary.model_dump(), files_data)

            # Stage 6: Ready
            self._update_progress(repo_id, "Ready", 100, "Repository indexed and ready for intelligence queries", is_complete=True)

            return summary

        except RepoIngestionError as e:
            self._update_progress(repo_id, "Failed", 0, e.message, is_complete=False, error_code=e.error_code, error_detail=e.message)
            raise
        except Exception as e:
            self._update_progress(repo_id, "Failed", 0, str(e), is_complete=False, error_code="INTERNAL_ERROR", error_detail=str(e))
            raise

    def analyze_zip_archive(self, zip_bytes: bytes, filename: str) -> RepositorySummary:
        """
        Safely extracts an uploaded repository ZIP archive with strict zip bomb
        and path traversal prevention, then runs ingestion.
        """
        import io
        repo_name = filename.rsplit(".", 1)[0].replace(" ", "-")
        safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "", repo_name) or "uploaded-repo"
        repo_id = f"zip-{hashlib.sha256(zip_bytes).hexdigest()[:12]}"

        dest_dir = settings.REPOS_DIR / repo_id
        if dest_dir.exists():
            _safe_remove_directory(dest_dir)
        dest_dir.mkdir(parents=True, exist_ok=True)

        try:
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
                total_uncompressed = 0
                for member in z.infolist():
                    # Zip bomb protection
                    total_uncompressed += member.file_size
                    if total_uncompressed > (settings.MAX_REPO_SIZE_MB * 1024 * 1024):
                        raise RepoIngestionError("ARCHIVE_TOO_LARGE", f"Archive extracted size exceeds {settings.MAX_REPO_SIZE_MB}MB limit.", 400)

                    # Path traversal protection
                    target_path = (dest_dir / member.filename).resolve()
                    if not str(target_path).startswith(str(dest_dir.resolve())):
                        raise RepoIngestionError("PATH_TRAVERSAL", "Malicious path traversal sequence in archive member.", 400)

                    if self._is_sensitive_file(member.filename):
                        continue

                    z.extract(member, dest_dir)
        except zipfile.BadZipFile:
            _safe_remove_directory(dest_dir)
            raise RepoIngestionError("INVALID_ZIP", "Uploaded file is not a valid ZIP archive.", 400)

        # Scan and parse extracted folder
        files_data: Dict[str, Dict[str, Any]] = {}
        for root, dirs, files in os.walk(dest_dir):
            dirs[:] = [d for d in dirs if d not in self.IGNORE_DIRS]
            for file in files:
                if self._is_sensitive_file(file):
                    continue
                ext = file.split(".")[-1].lower() if "." in file else ""
                if ext in self.INDEXABLE_EXTENSIONS:
                    full_path = Path(root) / file
                    rel_path = str(full_path.relative_to(dest_dir)).replace("\\", "/")
                    try:
                        content = full_path.read_text(encoding="utf-8", errors="ignore")
                        lang = self.INDEXABLE_EXTENSIONS.get(ext, ext)
                        symbols, file_info = ASTParser.parse_file(rel_path, content, lang)
                        files_data[rel_path] = {
                            "content": content,
                            "layer": file_info.layer,
                            "language": self.INDEXABLE_EXTENSIONS[ext],
                            "symbols": [s.model_dump() for s in symbols],
                            "dependencies": file_info.imports,
                            "dependents": []
                        }
                    except Exception:
                        continue

        if not files_data:
            _safe_remove_directory(dest_dir)
            raise RepoIngestionError("NO_INDEXABLE_FILES", "No indexable code files found in archive.", 400)

        self.graph_service.build_from_repo_data(files_data, repo_id=repo_id)
        self.vector_store.index_repository(
            files_data,
            repo_id=repo_id,
            repo_url=None,
            branch="archive",
            commit_sha=hashlib.sha256(zip_bytes).hexdigest()[:10]
        )
        health = HealthScorerService.calculate_health(files_data)

        func_cnt = sum(len([s for s in info.get("symbols", []) if s.get("kind") in ["function", "method"]]) for info in files_data.values())
        class_cnt = sum(len([s for s in info.get("symbols", []) if s.get("kind") in ["class", "interface"]]) for info in files_data.values())
        dep_cnt = sum(len(info.get("dependencies", [])) for info in files_data.values())
        test_cnt = sum(1 for info in files_data.values() if info.get("layer") == "test")
        languages = self._calculate_languages(files_data)

        summary = RepositorySummary(
            id=repo_id,
            name=safe_name,
            owner="local-upload",
            branch="archive",
            commit_sha=hashlib.sha256(zip_bytes).hexdigest()[:10],
            repo_url=None,
            description=f"Ingested ZIP archive '{filename}'",
            languages=languages,
            file_count=len(files_data),
            function_count=func_cnt,
            class_count=class_cnt,
            dependency_count=dep_cnt,
            test_file_count=test_cnt,
            doc_percentage=health.documentation,
            codebase_health=health,
            is_demo=False,
            indexing_status="Ready",
            analysis_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            tree=self._build_file_tree(list(files_data.keys()))
        )

        self.db.save_repository(summary.model_dump(), files_data)
        self._update_progress(repo_id, "Ready", 100, "Archive processed successfully", is_complete=True)
        return summary

    def get_repository(self, repo_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves repository details strictly matching repo_id.
        Does NOT silently fall back to demo repository for nonexistent custom IDs.
        """
        data = self.db.get_repository(repo_id)
        if not data:
            return None
        files = self.db.get_repository_files(repo_id)
        summary = RepositorySummary(**data)
        return {"summary": summary, "files": files}

    def delete_repository(self, repo_id: str) -> bool:
        """Safely removes repository record, files, vectors, graph, and cloned directory on disk."""
        if repo_id == "demo-ecommerce":
            # Protect demo repository from accidental complete deletion
            return False

        # 1. Remove from database
        self.db.delete_repository(repo_id)
        # 2. Remove vectors
        self.vector_store.delete_repository_vectors(repo_id)
        # 3. Remove graph
        self.graph_service.delete_repository_graph(repo_id)
        # 4. Remove progress
        self.progress_states.pop(repo_id, None)
        # 5. Remove disk directory
        dest_dir = settings.REPOS_DIR / repo_id
        if dest_dir.exists():
            _safe_remove_directory(dest_dir)
        return True

    def _update_progress(
        self,
        repo_id: str,
        stage: str,
        pct: int,
        message: str,
        is_complete: bool = False,
        error_code: Optional[str] = None,
        error_detail: Optional[str] = None
    ):
        prog = AnalysisProgress(
            stage=stage,
            progress_pct=pct,
            message=message,
            is_complete=is_complete,
            repository_id=repo_id,
            error_code=error_code,
            error_detail=error_detail
        )
        self.progress_states[repo_id] = prog
        self.db.set_progress(repo_id, stage, pct, message, is_complete, error_code, error_detail)
