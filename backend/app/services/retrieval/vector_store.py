"""
Vector Store & Hybrid Code Retrieval Service.
Integrates with Qdrant vector database (memory or persistent) with scikit-learn dense vector
indexing and AST-aware metadata filtering for hybrid code search.
"""

from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.core.config import settings
from app.models.schemas import SearchResult

class VectorStoreService:
    def __init__(self):
        # Initialize Qdrant Client in-memory or remote
        try:
            if settings.QDRANT_URL and settings.QDRANT_URL != ":memory:":
                self.client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY or None
                )
            else:
                self.client = QdrantClient(":memory:")
        except Exception:
            self.client = QdrantClient(":memory:")

        self.collection_name = "repomind_codebase"
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=128)
        self.chunks: List[Dict[str, Any]] = []
        self.embeddings_matrix: Optional[np.ndarray] = None
        self._init_collection()

    def _init_collection(self):
        try:
            self.client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config=qmodels.VectorParams(size=128, distance=qmodels.Distance.COSINE)
            )
        except Exception:
            pass

    def index_repository(self, files_data: Dict[str, Dict[str, Any]]):
        """Chunks repository files by functions, classes, and file-level blocks, then builds vector index."""
        self.chunks = []
        texts_for_fitting = []

        for path, info in files_data.items():
            content = info.get("content", "")
            lines = content.split("\n")
            symbols = info.get("symbols", [])
            layer = info.get("layer", "service")

            # 1. Index each AST Symbol specifically
            for sym in symbols:
                start = max(1, sym.get("line_start", 1))
                end = min(len(lines), sym.get("line_end", len(lines)))
                snippet = "\n".join(lines[start - 1 : end])
                
                chunk_text = f"{sym.get('kind')} {sym.get('name')} in {path}. Calls: {' '.join(sym.get('calls', []))}. {snippet}"
                texts_for_fitting.append(chunk_text)
                
                self.chunks.append({
                    "file_path": path,
                    "symbol_name": sym.get("name"),
                    "symbol_kind": sym.get("kind"),
                    "snippet": snippet,
                    "line_start": start,
                    "line_end": end,
                    "layer": layer,
                    "calls": sym.get("calls", []),
                    "search_text": chunk_text
                })

            # 2. Index file overview chunk
            overview_snippet = "\n".join(lines[:min(25, len(lines))])
            overview_text = f"File {path} layer {layer} contains symbols {', '.join([s.get('name') for s in symbols])} \n {overview_snippet}"
            texts_for_fitting.append(overview_text)
            self.chunks.append({
                "file_path": path,
                "symbol_name": path.split("/")[-1],
                "symbol_kind": "file",
                "snippet": overview_snippet,
                "line_start": 1,
                "line_end": min(25, len(lines)),
                "layer": layer,
                "calls": [],
                "search_text": overview_text
            })

        if texts_for_fitting:
            self.embeddings_matrix = self.vectorizer.fit_transform(texts_for_fitting).toarray()
            # Insert into Qdrant
            points = []
            for i, chunk in enumerate(self.chunks):
                vec = self.embeddings_matrix[i].tolist()
                points.append(qmodels.PointStruct(
                    id=i,
                    vector=vec,
                    payload=chunk
                ))
            try:
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=points
                )
            except Exception:
                pass

    def hybrid_search(self, query: str, kind_filter: Optional[str] = "all", layer_filter: Optional[str] = "all", limit: int = 8) -> List[SearchResult]:
        """Performs hybrid code retrieval: semantic cosine similarity + AST symbol exact boost."""
        if not self.chunks or self.embeddings_matrix is None:
            return []

        q_lower = query.lower()
        q_vec = self.vectorizer.transform([query]).toarray()
        cos_scores = cosine_similarity(q_vec, self.embeddings_matrix)[0]

        scored_results = []
        for idx, chunk in enumerate(self.chunks):
            # Filtering
            if kind_filter and kind_filter != "all":
                if chunk["symbol_kind"] != kind_filter:
                    continue
            if layer_filter and layer_filter != "all":
                if chunk["layer"] != layer_filter:
                    continue

            score = float(cos_scores[idx])

            # AST exact/token matching bonus
            sym_name = chunk["symbol_name"].lower()
            file_name = chunk["file_path"].lower()

            if sym_name in q_lower or q_lower in sym_name:
                score += 0.35
            if file_name.split("/")[-1].split(".")[0] in q_lower:
                score += 0.25

            # Keyword matches in code snippet
            for token in q_lower.split():
                if len(token) > 2 and token in chunk["search_text"].lower():
                    score += 0.08

            normalized_score = min(0.99, max(0.10, score))

            explanation = (
                f"Matched AST {chunk['symbol_kind']} '{chunk['symbol_name']}' in {chunk['file_path']} "
                f"with relevance score {normalized_score:.2f}."
            )

            scored_results.append((normalized_score, SearchResult(
                file_path=chunk["file_path"],
                symbol_name=chunk["symbol_name"],
                symbol_kind=chunk["symbol_kind"],
                snippet=chunk["snippet"],
                line_start=chunk["line_start"],
                line_end=chunk["line_end"],
                score=round(normalized_score, 3),
                explanation=explanation
            )))

        scored_results.sort(key=lambda x: x[0], reverse=True)
        return [res for _, res in scored_results[:limit]]
