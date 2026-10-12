"""
Vector Store & Hybrid Code Retrieval Service for RepoMind.
Integrates persistent Qdrant vector database (on-disk, remote, or in-memory)
with local SentenceTransformers, BM25Okapi inverted index, and Reciprocal Rank Fusion (RRF).
Enforces strict multi-repository isolation, deterministic upserts, and chunk deduplication.
"""

import uuid
import threading
import logging
import atexit
from typing import List, Dict, Any, Optional, Set, Tuple
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.core.config import settings
from app.models.schemas import SearchResult, CodeChunk
from app.services.parser.ast_parser import ASTParser
from app.services.retrieval.embedding_service import EmbeddingService
from app.services.retrieval.bm25 import BM25Index

logger = logging.getLogger(__name__)

_client_lock = threading.Lock()
_shared_client_instance: Optional[QdrantClient] = None


def _cleanup_qdrant_client():
    """Cleanly closes Qdrant client during process termination to avoid Python 3.14 __del__ teardown issues."""
    global _shared_client_instance
    with _client_lock:
        if _shared_client_instance is not None:
            try:
                if hasattr(_shared_client_instance, "close"):
                    _shared_client_instance.close()
            except Exception:
                pass
            _shared_client_instance = None


atexit.register(_cleanup_qdrant_client)


def get_qdrant_client() -> QdrantClient:
    global _shared_client_instance
    with _client_lock:
        if _shared_client_instance is not None:
            return _shared_client_instance

        try:
            if settings.QDRANT_URL and settings.QDRANT_URL.startswith(("http://", "https://")):
                client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY or None
                )
            elif settings.QDRANT_URL == ":memory:":
                client = QdrantClient(":memory:")
            else:
                client = QdrantClient(path=str(settings.QDRANT_STORAGE_DIR))
        except Exception as e:
            logger.warning("Could not open persistent Qdrant at %s: %s. Using in-memory mode.", settings.QDRANT_STORAGE_DIR, e)
            client = QdrantClient(":memory:")

        _shared_client_instance = client
        return client


class VectorStoreService:
    def __init__(self, embedding_service: Optional[EmbeddingService] = None, client: Optional[QdrantClient] = None):
        self.embedding_service = embedding_service or EmbeddingService()
        self.client = client or get_qdrant_client()

        # Dimension-scoped collection name to never mix incompatible models/dimensions
        self.collection_name = f"{settings.QDRANT_COLLECTION_PREFIX}_{self.embedding_service.dimension}"

        # Per-repository in-memory caches (re-hydrated from Qdrant on restart)
        self.chunks_by_repo: Dict[str, List[Dict[str, Any]]] = {}
        self.bm25_by_repo: Dict[str, BM25Index] = {}

        self._init_collection()

    def _init_collection(self):
        """Safely creates collection if it doesn't already exist. Never drops user data."""
        try:
            exists = False
            if hasattr(self.client, "collection_exists"):
                exists = self.client.collection_exists(self.collection_name)

            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=qmodels.VectorParams(
                        size=self.embedding_service.dimension,
                        distance=qmodels.Distance.COSINE
                    )
                )
                logger.info("Initialized Qdrant collection: %s (dim=%d)", self.collection_name, self.embedding_service.dimension)
            else:
                # Validate dimension matches if collection already exists
                coll_info = self.client.get_collection(self.collection_name)
                existing_dim = coll_info.config.params.vectors.size
                if existing_dim != self.embedding_service.dimension:
                    logger.warning(
                        "Collection %s has dimension %d, but model requires %d. Versioning collection.",
                        self.collection_name, existing_dim, self.embedding_service.dimension
                    )
                    self.collection_name = f"{self.collection_name}_v{self.embedding_service.dimension}"
                    self.client.create_collection(
                        collection_name=self.collection_name,
                        vectors_config=qmodels.VectorParams(
                            size=self.embedding_service.dimension,
                            distance=qmodels.Distance.COSINE
                        )
                    )
        except Exception as e:
            logger.error("Error initializing Qdrant collection %s: %s", self.collection_name, e)

    def _ensure_repo_hydrated(self, repo_id: str):
        """
        Hydrates in-memory chunks and BM25 index from persistent Qdrant points
        if they were not already loaded in the current process lifecycle.
        """
        if repo_id in self.chunks_by_repo and repo_id in self.bm25_by_repo:
            return

        try:
            # Scroll points from Qdrant for this repository
            records, _ = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(
                            key="repository_id",
                            match=qmodels.MatchValue(value=repo_id)
                        )
                    ]
                ),
                limit=1000,
                with_payload=True,
                with_vectors=False
            )

            if records:
                chunks = [r.payload for r in records if r.payload]
                self.chunks_by_repo[repo_id] = chunks
                self.bm25_by_repo[repo_id] = BM25Index().fit(chunks)
                logger.info("Hydrated %d chunks from persistent Qdrant for repo '%s'", len(chunks), repo_id)
            else:
                if repo_id not in self.chunks_by_repo:
                    self.chunks_by_repo[repo_id] = []
                if repo_id not in self.bm25_by_repo:
                    self.bm25_by_repo[repo_id] = BM25Index().fit([])
        except Exception as e:
            logger.warning("Could not hydrate repo '%s' from Qdrant: %s", repo_id, e)
            if repo_id not in self.chunks_by_repo:
                self.chunks_by_repo[repo_id] = []
            if repo_id not in self.bm25_by_repo:
                self.bm25_by_repo[repo_id] = BM25Index().fit([])

    def index_repository(
        self,
        files_data: Dict[str, Dict[str, Any]],
        repo_id: str = "demo-ecommerce",
        repo_url: Optional[str] = None,
        branch: Optional[str] = "main",
        commit_sha: Optional[str] = None
    ):
        """
        Syntax-aware chunking and isolated vector indexing for repo_id.
        Persists embeddings and payloads to Qdrant with deterministic UUIDs.
        """
        # Clean any prior vectors for this repository BEFORE populating new ones
        self.delete_repository_vectors(repo_id)

        all_chunks: List[CodeChunk] = []

        for path, info in files_data.items():
            content = info.get("content", "")
            lang = info.get("language") or ("typescript" if path.endswith((".ts", ".tsx")) else "python" if path.endswith(".py") else "javascript")
            file_chunks = ASTParser.chunk_file(
                file_path=path,
                code=content,
                language=lang,
                repo_id=repo_id,
                repo_url=repo_url,
                branch=branch,
                commit_sha=commit_sha
            )
            all_chunks.extend(file_chunks)

        chunk_payloads = [c.model_dump() for c in all_chunks]
        self.chunks_by_repo[repo_id] = chunk_payloads

        # Fit isolated BM25 index
        bm25_idx = BM25Index().fit(chunk_payloads)
        self.bm25_by_repo[repo_id] = bm25_idx

        if not all_chunks:
            return

        # Generate dense embeddings locally via SentenceTransformers
        search_texts = [c.search_text or f"{c.symbol_name} {c.snippet}" for c in all_chunks]
        embeddings = self.embedding_service.embed_documents(search_texts)

        points = []
        for i, chunk in enumerate(chunk_payloads):
            vec = embeddings[i]
            # Deterministic, stable point UUID from chunk_id
            point_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk["chunk_id"]))
            points.append(qmodels.PointStruct(
                id=point_uuid,
                vector=vec,
                payload=chunk
            ))

        # Batch upsert into Qdrant
        batch_size = 64
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            try:
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=batch
                )
            except Exception as e:
                logger.error("Failed to upsert points batch to Qdrant: %s", e)

        logger.info("Indexed %d chunks for repository '%s' into Qdrant collection '%s'", len(points), repo_id, self.collection_name)

    def hybrid_search(
        self,
        query: str,
        repository_id: str = "demo-ecommerce",
        branch: Optional[str] = None,
        kind_filter: Optional[str] = "all",
        layer_filter: Optional[str] = "all",
        limit: int = 8,
        mode: str = "hybrid"  # "hybrid", "keyword", "semantic"
    ) -> List[SearchResult]:
        """
        Executes hybrid code retrieval using Reciprocal Rank Fusion (RRF)
        combining dense semantic retrieval (Qdrant) and lexical retrieval (BM25).
        Strictly isolated to repository_id and optional branch.
        """
        self._ensure_repo_hydrated(repository_id)
        repo_chunks = self.chunks_by_repo.get(repository_id, [])
        if not repo_chunks:
            return []

        q_lower = query.lower().strip()
        candidate_count = max(limit * 4, 30)

        # -------------------------------------------------------------
        # 1. Dense Semantic Retrieval via Qdrant
        # -------------------------------------------------------------
        dense_ranks: Dict[str, int] = {}
        dense_scores: Dict[str, float] = {}

        try:
            q_vec = self.embedding_service.embed_query(query)
            must_filters = [
                qmodels.FieldCondition(
                    key="repository_id",
                    match=qmodels.MatchValue(value=repository_id)
                )
            ]
            if branch:
                must_filters.append(
                    qmodels.FieldCondition(
                        key="branch",
                        match=qmodels.MatchValue(value=branch)
                    )
                )

            query_filter = qmodels.Filter(must=must_filters)
            q_res = self.client.query_points(
                collection_name=self.collection_name,
                query=q_vec,
                query_filter=query_filter,
                limit=candidate_count,
                with_payload=True
            )

            for rank_idx, pt in enumerate(q_res.points, 1):
                c_id = pt.payload.get("chunk_id") if pt.payload else None
                if c_id:
                    dense_ranks[c_id] = rank_idx
                    dense_scores[c_id] = float(pt.score)
        except Exception as e:
            logger.warning("Dense search query error in Qdrant: %s", e)

        # -------------------------------------------------------------
        # 2. Lexical Retrieval via BM25
        # -------------------------------------------------------------
        lexical_ranks: Dict[str, int] = {}
        lexical_scores: Dict[str, float] = {}
        bm25_idx = self.bm25_by_repo.get(repository_id)

        if bm25_idx:
            scored_bm25 = bm25_idx.score(query)
            for rank_idx, (doc_idx, b_score) in enumerate(scored_bm25[:candidate_count], 1):
                chunk = repo_chunks[doc_idx]
                c_id = chunk["chunk_id"]
                lexical_ranks[c_id] = rank_idx
                lexical_scores[c_id] = b_score

        # -------------------------------------------------------------
        # 3. Reciprocal Rank Fusion (RRF) & AST Exact Symbol Boosts
        # -------------------------------------------------------------
        rrf_k = settings.RRF_K  # standard 60
        fused_candidates: List[Tuple[float, Dict[str, Any]]] = []

        chunk_lookup = {c["chunk_id"]: c for c in repo_chunks}
        all_candidate_ids = set(dense_ranks.keys()).union(set(lexical_ranks.keys()))

        for c_id in all_candidate_ids:
            chunk = chunk_lookup.get(c_id)
            if not chunk:
                continue

            # Strict repository isolation check
            if chunk.get("repository_id") != repository_id:
                continue

            # Branch filtering if specified
            if branch and chunk.get("branch") and chunk.get("branch") != branch:
                continue

            # Kind & Layer Filters
            if kind_filter and kind_filter != "all":
                if chunk.get("symbol_kind") != kind_filter:
                    continue
            if layer_filter and layer_filter != "all":
                if chunk.get("layer") != layer_filter:
                    continue

            dense_sim = dense_scores.get(c_id, 0.0)
            bm25_sim = lexical_scores.get(c_id, 0.0)
            sym_name = (chunk.get("symbol_name") or "").lower()
            file_name = (chunk.get("file_path") or "").lower()

            has_keyword_match = (
                (sym_name and (sym_name in q_lower or any(t in sym_name for t in q_lower.split() if len(t) > 2)))
                or (file_name and any(t in file_name for t in q_lower.split() if len(t) > 2))
                or any(t in chunk.get("search_text", "").lower() for t in q_lower.split() if len(t) > 2)
            )

            # Minimum relevance guard: must have either BM25 > 0, keyword overlap, or dense cosine >= 0.28
            if dense_sim < 0.28 and bm25_sim <= 0.0 and not has_keyword_match:
                continue

            # RRF calculation based on retrieval mode
            dense_rank = dense_ranks.get(c_id, 999)
            lexical_rank = lexical_ranks.get(c_id, 999)

            if mode == "keyword" and c_id not in lexical_ranks:
                continue
            if mode == "semantic" and c_id not in dense_ranks:
                continue

            rrf_score = 0.0
            if mode in ("hybrid", "semantic") and c_id in dense_ranks:
                rrf_score += 1.0 / (rrf_k + dense_rank)
            if mode in ("hybrid", "keyword") and c_id in lexical_ranks:
                rrf_score += 1.0 / (rrf_k + lexical_rank)

            # AST Exact Symbol & Filename Boosts
            sym_name = (chunk.get("symbol_name") or "").lower()
            file_name = (chunk.get("file_path") or "").lower()

            # Exact symbol name match in query
            if sym_name and sym_name in q_lower:
                rrf_score += 0.025
            if file_name and (file_name.split("/")[-1].split(".")[0] in q_lower):
                rrf_score += 0.015

            # Dense similarity multiplier if high
            if c_id in dense_scores:
                rrf_score += max(0.0, (dense_scores[c_id] - 0.4) * 0.02)

            fused_candidates.append((rrf_score, chunk))

        # Sort descending by fused score
        fused_candidates.sort(key=lambda x: x[0], reverse=True)

        # -------------------------------------------------------------
        # 4. Chunk Deduplication (suppress redundant overlapping chunks)
        # -------------------------------------------------------------
        deduplicated_results: List[SearchResult] = []
        seen_spans: Dict[str, List[Tuple[int, int]]] = {}

        for score, chunk in fused_candidates:
            fpath = chunk["file_path"]
            start = chunk["line_start"]
            end = chunk["line_end"]

            # Check overlap with existing selected chunks for this file
            is_redundant = False
            if fpath in seen_spans:
                for existing_start, existing_end in seen_spans[fpath]:
                    overlap_start = max(start, existing_start)
                    overlap_end = min(end, existing_end)
                    if overlap_start <= overlap_end:
                        overlap_lines = overlap_end - overlap_start + 1
                        curr_lines = end - start + 1
                        # If current chunk has > 70% line overlap with already selected chunk, skip
                        if (overlap_lines / curr_lines) > 0.70:
                            is_redundant = True
                            break

            if is_redundant:
                continue

            if fpath not in seen_spans:
                seen_spans[fpath] = []
            seen_spans[fpath].append((start, end))

            # Normalize display score between 0.10 and 0.99
            norm_score = min(0.99, max(0.15, score * 25.0))

            explanation = (
                f"Retrieved {chunk.get('symbol_kind', 'code')} '{chunk.get('symbol_name') or chunk['file_path']}' "
                f"via hybrid RRF (dense+BM25) with score {norm_score:.3f}."
            )

            deduplicated_results.append(SearchResult(
                file_path=chunk["file_path"],
                symbol_name=chunk.get("symbol_name") or chunk["file_path"].split("/")[-1],
                symbol_kind=chunk.get("symbol_kind", "code"),
                snippet=chunk["snippet"],
                line_start=chunk["line_start"],
                line_end=chunk["line_end"],
                score=round(norm_score, 3),
                explanation=explanation,
                chunk_id=chunk["chunk_id"],
                repository_id=chunk["repository_id"],
                branch=chunk.get("branch"),
                commit_sha=chunk.get("commit_sha")
            ))

            if len(deduplicated_results) >= limit:
                break

        return deduplicated_results

    def delete_repository_vectors(self, repo_id: str) -> None:
        """Removes repository vectors from Qdrant and local memory without impacting others."""
        self.chunks_by_repo.pop(repo_id, None)
        self.bm25_by_repo.pop(repo_id, None)

        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="repository_id",
                                match=qmodels.MatchValue(value=repo_id)
                            )
                        ]
                    )
                )
            )
            logger.info("Deleted vector points for repository '%s' from Qdrant collection '%s'", repo_id, self.collection_name)
        except Exception as e:
            logger.warning("Error deleting vectors for repository '%s': %s", repo_id, e)
