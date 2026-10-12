"""
SQLite Persistent Storage for RepoMind Repository Metadata and Code Entities.
Provides atomic persistence for repositories, files, AST symbols, and ingestion states.
"""

import json
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.core.config import settings


class MetadataDB:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or settings.DB_PATH
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=30.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Repositories metadata table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS repositories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                owner TEXT NOT NULL,
                repo_url TEXT,
                branch TEXT NOT NULL,
                commit_sha TEXT,
                description TEXT,
                languages TEXT,
                file_count INTEGER DEFAULT 0,
                function_count INTEGER DEFAULT 0,
                class_count INTEGER DEFAULT 0,
                dependency_count INTEGER DEFAULT 0,
                test_file_count INTEGER DEFAULT 0,
                doc_percentage INTEGER DEFAULT 0,
                codebase_health TEXT,
                tree TEXT,
                is_demo INTEGER DEFAULT 0,
                indexing_status TEXT DEFAULT 'Ready',
                error_message TEXT,
                analysis_time TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """)

            # Files table with repository isolation
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS repository_files (
                repository_id TEXT NOT NULL,
                path TEXT NOT NULL,
                content TEXT NOT NULL,
                layer TEXT,
                language TEXT,
                symbols TEXT,
                dependencies TEXT,
                dependents TEXT,
                PRIMARY KEY (repository_id, path),
                FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
            )
            """)

            # Progress table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS ingestion_progress (
                repository_id TEXT PRIMARY KEY,
                stage TEXT NOT NULL,
                progress_pct INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_complete INTEGER NOT NULL,
                error_code TEXT,
                error_detail TEXT,
                updated_at TEXT
            )
            """)
            conn.commit()

    def save_repository(
        self,
        repo_data: Dict[str, Any],
        files_data: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> None:
        """Saves repository summary and all file records atomically."""
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        repo_id = repo_data["id"]

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO repositories (
                id, name, owner, repo_url, branch, commit_sha, description,
                languages, file_count, function_count, class_count, dependency_count,
                test_file_count, doc_percentage, codebase_health, tree, is_demo,
                indexing_status, error_message, analysis_time, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                owner=excluded.owner,
                repo_url=excluded.repo_url,
                branch=excluded.branch,
                commit_sha=excluded.commit_sha,
                description=excluded.description,
                languages=excluded.languages,
                file_count=excluded.file_count,
                function_count=excluded.function_count,
                class_count=excluded.class_count,
                dependency_count=excluded.dependency_count,
                test_file_count=excluded.test_file_count,
                doc_percentage=excluded.doc_percentage,
                codebase_health=excluded.codebase_health,
                tree=excluded.tree,
                is_demo=excluded.is_demo,
                indexing_status=excluded.indexing_status,
                error_message=excluded.error_message,
                analysis_time=excluded.analysis_time,
                updated_at=excluded.updated_at
            """, (
                repo_id,
                repo_data.get("name", "unknown"),
                repo_data.get("owner", "unknown"),
                repo_data.get("repo_url"),
                repo_data.get("branch", "main"),
                repo_data.get("commit_sha", ""),
                repo_data.get("description", ""),
                json.dumps(repo_data.get("languages", {})),
                repo_data.get("file_count", 0),
                repo_data.get("function_count", 0),
                repo_data.get("class_count", 0),
                repo_data.get("dependency_count", 0),
                repo_data.get("test_file_count", 0),
                repo_data.get("doc_percentage", 0),
                json.dumps(repo_data.get("codebase_health", {})),
                json.dumps(repo_data.get("tree", {})),
                1 if repo_data.get("is_demo") else 0,
                repo_data.get("indexing_status", "Ready"),
                repo_data.get("error_message"),
                repo_data.get("analysis_time", now),
                now,
                now
            ))

            if files_data is not None:
                # Remove prior files for this repository to support clean re-indexing
                cursor.execute("DELETE FROM repository_files WHERE repository_id = ?", (repo_id,))
                for path, info in files_data.items():
                    cursor.execute("""
                    INSERT INTO repository_files (
                        repository_id, path, content, layer, language, symbols, dependencies, dependents
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        repo_id,
                        path,
                        info.get("content", ""),
                        info.get("layer", "service"),
                        info.get("language", "typescript"),
                        json.dumps(info.get("symbols", [])),
                        json.dumps(info.get("dependencies", [])),
                        json.dumps(info.get("dependents", []))
                    ))

            conn.commit()

    def get_repository(self, repo_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repositories WHERE id = ?", (repo_id,))
            row = cursor.fetchone()
            if not row:
                return None

            data = dict(row)
            data["languages"] = json.loads(data["languages"]) if data["languages"] else {}
            data["codebase_health"] = json.loads(data["codebase_health"]) if data["codebase_health"] else {}
            data["tree"] = json.loads(data["tree"]) if data["tree"] else {}
            data["is_demo"] = bool(data["is_demo"])
            return data

    def get_repository_files(self, repo_id: str) -> Dict[str, Dict[str, Any]]:
        files: Dict[str, Dict[str, Any]] = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repository_files WHERE repository_id = ?", (repo_id,))
            for row in cursor.fetchall():
                path = row["path"]
                files[path] = {
                    "content": row["content"],
                    "layer": row["layer"],
                    "language": row["language"],
                    "symbols": json.loads(row["symbols"]) if row["symbols"] else [],
                    "dependencies": json.loads(row["dependencies"]) if row["dependencies"] else [],
                    "dependents": json.loads(row["dependents"]) if row["dependents"] else []
                }
        return files

    def list_repositories(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, owner, branch, commit_sha, file_count, is_demo, indexing_status, analysis_time FROM repositories ORDER BY updated_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    def delete_repository(self, repo_id: str) -> bool:
        """Safely removes repository record and files without touching other repositories."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM repository_files WHERE repository_id = ?", (repo_id,))
            cursor.execute("DELETE FROM ingestion_progress WHERE repository_id = ?", (repo_id,))
            cursor.execute("DELETE FROM repositories WHERE id = ?", (repo_id,))
            conn.commit()
            return cursor.rowcount > 0

    def set_progress(
        self,
        repo_id: str,
        stage: str,
        progress_pct: int,
        message: str,
        is_complete: bool = False,
        error_code: Optional[str] = None,
        error_detail: Optional[str] = None
    ) -> None:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO ingestion_progress (
                repository_id, stage, progress_pct, message, is_complete, error_code, error_detail, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(repository_id) DO UPDATE SET
                stage=excluded.stage,
                progress_pct=excluded.progress_pct,
                message=excluded.message,
                is_complete=excluded.is_complete,
                error_code=excluded.error_code,
                error_detail=excluded.error_detail,
                updated_at=excluded.updated_at
            """, (repo_id, stage, progress_pct, message, 1 if is_complete else 0, error_code, error_detail, now))
            conn.commit()

    def get_progress(self, repo_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ingestion_progress WHERE repository_id = ?", (repo_id,))
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            res["is_complete"] = bool(res["is_complete"])
            return res
