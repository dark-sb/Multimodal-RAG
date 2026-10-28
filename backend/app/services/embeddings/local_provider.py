import math
import re
from typing import List
from app.services.embeddings.base import BaseEmbeddingProvider

class LocalSemanticEmbeddingProvider(BaseEmbeddingProvider):
    """
    High-performance, zero-external-dependency semantic vector embedding provider.
    Uses subword n-gram feature hashing and term-frequency L2-normalized projections
    into 384-dimensional semantic space.
    Guarantees fast, offline, deterministic vector similarity for ChromaDB.
    """
    def __init__(self, dimension: int = 384):
        self._dim = dimension

    @property
    def dimension(self) -> int:
        return self._dim

    def _tokenize(self, text: str) -> List[str]:
        # Lowercase, clean punctuation
        cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
        tokens = cleaned.split()
        features = []
        for t in tokens:
            features.append(t)
            # Add character tri-grams for subword morphology matching
            if len(t) >= 4:
                for i in range(len(t) - 2):
                    features.append(t[i:i+3])
        return features

    def _hash_to_vec(self, text: str) -> List[float]:
        vec = [0.0] * self._dim
        features = self._tokenize(text)
        if not features:
            return vec

        for feat in features:
            # Deterministic FNV-1a hash
            h = 2166136261
            for char in feat:
                h = (h ^ ord(char)) * 16777619 & 0xFFFFFFFF
            idx = h % self._dim
            sign = 1.0 if ((h >> 16) & 1) == 0 else -1.0
            vec[idx] += sign

        # L2 normalize
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 1e-9:
            vec = [x / norm for x in vec]
        return vec

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._hash_to_vec(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._hash_to_vec(text)
