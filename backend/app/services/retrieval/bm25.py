"""
BM25 & Lexical Retrieval Service for RepoMind.
Performs syntax-aware tokenization and BM25Okapi ranking for source code.
Combines exact symbol matching with sub-token inverted index scoring.
"""

import math
import re
from typing import List, Dict, Any, Tuple, Optional
from collections import Counter


def tokenize_code(text: str) -> List[str]:
    """
    Tokenizes source code with awareness of camelCase, snake_case,
    symbols, file paths, and identifiers.
    """
    # Split on whitespace and non-alphanumeric except underscores and dots
    raw_tokens = re.findall(r'[a-zA-Z0-9_\.]+', text.lower())
    tokens: List[str] = []

    for t in raw_tokens:
        if len(t) < 2:
            continue
        tokens.append(t)
        # Split on dot
        if "." in t:
            parts = t.split(".")
            for p in parts:
                if len(p) >= 2:
                    tokens.append(p)
        # Split on underscore
        if "_" in t:
            parts = t.split("_")
            for p in parts:
                if len(p) >= 2:
                    tokens.append(p)
        # Split camelCase
        camel_parts = re.findall(r'[a-z]+|[A-Z][a-z]+|[A-Z]+(?=[A-Z][a-z]|\b)', t)
        if len(camel_parts) > 1:
            for cp in camel_parts:
                cp_lower = cp.lower()
                if len(cp_lower) >= 2:
                    tokens.append(cp_lower)

    return tokens


class BM25Index:
    """
    BM25Okapi inverted index implementation for repository code chunks.
    Scoped strictly to individual repositories.
    """
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus_size = 0
        self.avg_doc_len = 0.0
        self.doc_lengths: List[int] = []
        self.doc_freqs: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.term_freqs: List[Counter] = []
        self.chunks: List[Dict[str, Any]] = []

    def fit(self, chunks: List[Dict[str, Any]]) -> "BM25Index":
        self.chunks = chunks
        self.corpus_size = len(chunks)
        self.doc_lengths = []
        self.term_freqs = []
        self.doc_freqs = {}

        if self.corpus_size == 0:
            self.avg_doc_len = 0.0
            return self

        total_length = 0
        for chunk in chunks:
            text = chunk.get("search_text") or f"{chunk.get('symbol_name', '')} {chunk.get('snippet', '')}"
            tokens = tokenize_code(text)
            doc_len = len(tokens)
            self.doc_lengths.append(doc_len)
            total_length += doc_len

            tf = Counter(tokens)
            self.term_freqs.append(tf)

            for term in tf.keys():
                self.doc_freqs[term] = self.doc_freqs.get(term, 0) + 1

        self.avg_doc_len = total_length / self.corpus_size if self.corpus_size > 0 else 0.0

        # Calculate IDF with standard Robertson-Spärck Jones formula
        self.idf = {}
        for term, freq in self.doc_freqs.items():
            # Standard smoothed BM25 IDF: ln((N - n + 0.5) / (n + 0.5) + 1)
            idf_val = math.log((self.corpus_size - freq + 0.5) / (freq + 0.5) + 1.0)
            self.idf[term] = max(0.01, idf_val)

        return self

    def score(self, query: str) -> List[Tuple[int, float]]:
        """
        Calculates BM25 scores for all documents in the index.
        Returns list of (doc_index, score) sorted descending by score.
        """
        if self.corpus_size == 0:
            return []

        q_tokens = tokenize_code(query)
        if not q_tokens:
            return []

        scores = [0.0] * self.corpus_size
        q_lower = query.lower().strip()

        for term in q_tokens:
            idf = self.idf.get(term, 0.0)
            if idf <= 0:
                continue

            for idx in range(self.corpus_size):
                tf = self.term_freqs[idx].get(term, 0)
                if tf == 0:
                    continue
                doc_len = self.doc_lengths[idx]
                denom = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / (self.avg_doc_len or 1.0)))
                scores[idx] += idf * (tf * (self.k1 + 1.0)) / (denom or 1.0)

        # Apply exact symbol and filename match bonuses
        for idx, chunk in enumerate(self.chunks):
            sym = (chunk.get("symbol_name") or "").lower()
            f_path = (chunk.get("file_path") or "").lower()

            if sym and sym == q_lower:
                scores[idx] += 4.0
            elif sym and (sym in q_lower or q_lower in sym):
                scores[idx] += 2.0

            if f_path:
                base_name = f_path.split("/")[-1].split(".")[0]
                if base_name in q_lower:
                    scores[idx] += 1.5

        scored_pairs = [(i, scores[i]) for i in range(self.corpus_size) if scores[i] > 0]
        scored_pairs.sort(key=lambda x: x[1], reverse=True)
        return scored_pairs
