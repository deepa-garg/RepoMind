"""
Local Embedding Service for RepoMind.
Utilizes SentenceTransformers with local on-device inference.
Strictly ensures dimension consistency, local execution (no code sent to remote APIs),
and clear offline/missing dependency error reporting.
"""

import threading
import logging
from typing import List, Union, Optional
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)

_model_lock = threading.Lock()
_model_instance = None


class EmbeddingService:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self.expected_dimension = settings.EMBEDDING_DIMENSION
        self._model = None
        self._ensure_model_loaded()

    def _ensure_model_loaded(self):
        global _model_instance
        if _model_instance is not None:
            self._model = _model_instance
            return

        with _model_lock:
            if _model_instance is not None:
                self._model = _model_instance
                return

            try:
                from sentence_transformers import SentenceTransformer
                logger.info("Loading local SentenceTransformer model: %s", self.model_name)
                loaded = SentenceTransformer(self.model_name)
                # Verify dimension
                test_vec = loaded.encode("repomind test", normalize_embeddings=True)
                actual_dim = len(test_vec)
                if actual_dim != self.expected_dimension:
                    logger.warning(
                        "Embedding model dimension %d differs from configured dimension %d. Updating dimension.",
                        actual_dim,
                        self.expected_dimension
                    )
                    self.expected_dimension = actual_dim

                _model_instance = loaded
                self._model = loaded
            except Exception as e:
                logger.error("Failed to load local SentenceTransformer '%s': %s", self.model_name, e)
                raise RuntimeError(
                    f"Embedding service initialization failure for model '{self.model_name}': {str(e)}. "
                    f"Verify that sentence-transformers and PyTorch are installed."
                ) from e

    @property
    def dimension(self) -> int:
        return self.expected_dimension

    def encode(self, texts: Union[str, List[str]], batch_size: int = 32) -> np.ndarray:
        """
        Locally generates dense embeddings for text or list of texts.
        Returns normalized numpy float array of shape (N, dimension).
        """
        if isinstance(texts, str):
            single = True
            texts = [texts]
        else:
            single = False

        if not texts:
            return np.empty((0, self.expected_dimension), dtype=np.float32)

        # Truncate inputs that are too long to respect token window
        sanitized = []
        for t in texts:
            if not t or not t.strip():
                sanitized.append("empty_chunk")
            else:
                # 4000 characters is a safe boundary for ~512-1024 tokens
                sanitized.append(t[:4000])

        vectors = self._model.encode(
            sanitized,
            batch_size=batch_size,
            show_progress_bar=False,
            normalize_embeddings=True,
            convert_to_numpy=True
        )

        vectors = np.asarray(vectors, dtype=np.float32)
        if single:
            return vectors[0]
        return vectors

    def embed_query(self, query: str) -> List[float]:
        """Generates embedding for a single query string."""
        vec = self.encode(query)
        return vec.tolist()

    def embed_documents(self, documents: List[str]) -> List[List[float]]:
        """Generates embeddings for a batch of documents."""
        vecs = self.encode(documents, batch_size=settings.EMBEDDING_BATCH_SIZE)
        return [v.tolist() for v in vecs]
