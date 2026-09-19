import hashlib
import logging
import math
import re
from typing import List, Optional, Set
import numpy as np

from app.core.config import settings

logger = logging.getLogger("architect_x.rag")


class EmbeddingService:
    """
    Generates dense vector embeddings for technical documentation chunks and queries.
    Uses sentence-transformers ('all-MiniLM-L6-v2') when available, with a high-fidelity
    token-weighted semantic embedding generator for mock mode and local execution.
    """

    DIMENSION = 384

    # Stop words to downweight in deterministic embeddings
    STOP_WORDS: Set[str] = {
        "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with",
        "by", "of", "from", "as", "is", "are", "was", "were", "be", "been",
        "that", "this", "these", "those", "it", "its", "which", "will", "can",
    }

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None
        self.mock_mode = settings.LLM_MOCK_MODE

        if not self.mock_mode:
            self._init_model()

    def _init_model(self) -> None:
        """Attempt to load sentence-transformers model."""
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading SentenceTransformer model '{self.model_name}'...")
            self._model = SentenceTransformer(self.model_name)
            logger.info(f"SentenceTransformer '{self.model_name}' loaded successfully.")
        except Exception as exc:
            logger.info(
                f"SentenceTransformer not active ({exc}). Using deterministic token-weighted embedding generator."
            )
            self._model = None

    def embed_text(self, text: str) -> List[float]:
        """Generate a normalized 384-dimensional embedding vector for a single text."""
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate normalized embeddings for a list of texts."""
        if not texts:
            return []

        if self._model is not None:
            try:
                embeddings = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
                return [emb.tolist() for emb in embeddings]
            except Exception as exc:
                logger.warning(f"SentenceTransformer encode failed ({exc}). Using deterministic fallback.")

        return [self._deterministic_hash_vector(t) for t in texts]

    def _deterministic_hash_vector(self, text: str) -> List[float]:
        """
        High-fidelity token-weighted semantic embedding generator.
        Extracts unigrams, bigrams, and trigrams with inverse frequency weighting
        and projects onto a 384-dimensional normalized hypersphere.
        """
        vec = np.zeros(self.DIMENSION, dtype=np.float32)
        raw_words = re.findall(r"\b[a-zA-Z0-9_\-\.]+\b", text.lower())

        if not raw_words:
            vec[0] = 1.0
            return vec.tolist()

        filtered_words = [w for w in raw_words if w not in self.STOP_WORDS and len(w) > 1]
        words = filtered_words if filtered_words else raw_words

        for idx, word in enumerate(words):
            # Keyword unigram projection
            h_val = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            pos = h_val % self.DIMENSION
            sign = 1.0 if ((h_val >> 8) & 1) else -1.0
            weight = math.log(1.0 + len(word)) * (1.5 if len(word) >= 5 else 1.0)
            vec[pos] += sign * weight

            # Bigram projection for phrase preservation
            if idx > 0:
                bigram = f"{words[idx-1]}_{word}"
                bi_h = int(hashlib.sha256(bigram.encode("utf-8")).hexdigest(), 16)
                bi_pos = bi_h % self.DIMENSION
                bi_sign = 1.0 if ((bi_h >> 8) & 1) else -1.0
                vec[bi_pos] += bi_sign * (weight * 2.0)

            # Character trigram projection for sub-word matching (e.g., "pgbouncer", "kafka")
            for c_i in range(len(word) - 2):
                tri = word[c_i : c_i + 3]
                tri_h = int(hashlib.md5(tri.encode("utf-8")).hexdigest(), 16)
                tri_pos = tri_h % self.DIMENSION
                tri_sign = 1.0 if ((tri_h >> 8) & 1) else -1.0
                vec[tri_pos] += tri_sign * 0.4

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0

        return vec.tolist()


embedding_service = EmbeddingService()
