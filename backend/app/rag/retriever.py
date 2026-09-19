import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np

from app.core.config import settings
from app.rag.schemas import EvidenceChunk, RetrievedEvidenceItem, IngestionSummary
from app.rag.embeddings import embedding_service
from app.rag.ingestion import document_ingestion_service

logger = logging.getLogger("architect_x.rag")


class VectorStoreRetriever:
    """
    Vector store retriever managing technical documentation embeddings in ChromaDB
    with high-performance in-memory vector search fallback.
    """

    COLLECTION_NAME = "architect_x_evidence"

    def __init__(self, persist_dir: Optional[str] = None):
        self.persist_dir = persist_dir or os.getenv("CHROMA_PERSIST_DIRECTORY") or "chroma_db"
        self._chroma_client = None
        self._collection = None
        self._in_memory_chunks: List[EvidenceChunk] = []
        self._in_memory_vectors: Optional[np.ndarray] = None
        self.mock_mode = settings.LLM_MOCK_MODE

        self._init_vector_store()

    def _init_vector_store(self) -> None:
        """Initialize ChromaDB client or prepare in-memory fallback."""
        try:
            import chromadb

            persist_path = Path(self.persist_dir).resolve()
            persist_path.mkdir(parents=True, exist_ok=True)

            self._chroma_client = chromadb.PersistentClient(path=str(persist_path))
            self._collection = self._chroma_client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(f"ChromaDB persistent client initialized at '{persist_path}'")
        except Exception as exc:
            logger.info(f"ChromaDB using in-memory vector index fallback ({exc}).")
            self._chroma_client = None
            self._collection = None

        # Preload and index documents
        self.ensure_indexed()

    def ensure_indexed(self) -> IngestionSummary:
        """Load knowledge base documents and index them if not already present."""
        chunks = document_ingestion_service.load_all_documents()
        if not chunks:
            logger.warning("No knowledge base documents found to index.")
            return IngestionSummary(
                documents_processed=0,
                chunks_created=0,
                sources=[],
                status="empty",
                message="No markdown files found in knowledge_base directory.",
            )

        self._in_memory_chunks = chunks
        texts = [c.text for c in chunks]
        vectors = embedding_service.embed_batch(texts)
        self._in_memory_vectors = np.array(vectors, dtype=np.float32)

        # Index in ChromaDB if client is active
        if self._collection is not None:
            try:
                ids = [c.chunk_id for c in chunks]
                metadatas = [
                    {
                        "source": c.source,
                        "section": c.section or "",
                        "char_count": len(c.text),
                    }
                    for c in chunks
                ]
                self._collection.upsert(
                    ids=ids,
                    embeddings=vectors,
                    documents=texts,
                    metadatas=metadatas,
                )
                logger.info(f"Indexed {len(chunks)} chunks into ChromaDB collection '{self.COLLECTION_NAME}'")
            except Exception as exc:
                logger.warning(f"ChromaDB upsert failed ({exc}). Using in-memory fallback index.")

        unique_sources = list({c.source for c in chunks})
        return IngestionSummary(
            documents_processed=len(unique_sources),
            chunks_created=len(chunks),
            sources=unique_sources,
            status="indexed",
            message=f"Successfully indexed {len(chunks)} chunks from {len(unique_sources)} documents.",
        )

    def search(
        self,
        query: str,
        top_k: int = 4,
        threshold: float = 0.12,
        conflict_id: Optional[Any] = None,
    ) -> List[RetrievedEvidenceItem]:
        """
        Execute semantic similarity search for a query string.
        Returns top-k matching evidence items exceeding the relevance threshold.
        """
        if not query or not query.strip():
            return []

        # Ensure index is populated
        if not self._in_memory_chunks or self._in_memory_vectors is None:
            self.ensure_indexed()

        query_vec = embedding_service.embed_text(query)

        # 1. Try ChromaDB Search
        if self._collection is not None:
            try:
                res = self._collection.query(
                    query_embeddings=[query_vec],
                    n_results=min(top_k, len(self._in_memory_chunks)),
                    include=["documents", "metadatas", "distances"],
                )
                items: List[RetrievedEvidenceItem] = []
                docs = res.get("documents", [[]])[0]
                metas = res.get("metadatas", [[]])[0]
                distances = res.get("distances", [[]])[0]

                for doc, meta, dist in zip(docs, metas, distances):
                    # Chroma cosine distance = 1.0 - cosine_similarity
                    raw_sim = max(0.0, 1.0 - float(dist))
                    if embedding_service._model is not None:
                        sim = raw_sim
                    else:
                        sim = min(0.98, max(0.0, raw_sim * 2.5))

                    if sim >= threshold:
                        items.append(
                            RetrievedEvidenceItem(
                                query=query,
                                source=meta.get("source", "knowledge_base"),
                                section=meta.get("section") or None,
                                excerpt=doc,
                                relevance_score=round(float(sim), 2),
                                evidence_metadata=meta,
                                conflict_id=conflict_id,
                            )
                        )
                # If Chroma returned items (or empty because threshold filtered them out), return directly
                return items
            except Exception as exc:
                logger.warning(f"ChromaDB query failed ({exc}), falling back to in-memory search.")

        # 2. In-Memory Vector Search Fallback
        return self._in_memory_search(query, query_vec, top_k, threshold, conflict_id)

    def _in_memory_search(
        self,
        query: str,
        query_vec: List[float],
        top_k: int,
        threshold: float,
        conflict_id: Optional[Any],
    ) -> List[RetrievedEvidenceItem]:
        """Cosine similarity search directly against in-memory numpy matrix."""
        if self._in_memory_vectors is None or len(self._in_memory_chunks) == 0:
            return []

        q_arr = np.array(query_vec, dtype=np.float32)
        q_norm = np.linalg.norm(q_arr)
        if q_norm > 0:
            q_arr = q_arr / q_norm

        scores = np.dot(self._in_memory_vectors, q_arr)
        top_indices = np.argsort(scores)[::-1][:top_k]

        results: List[RetrievedEvidenceItem] = []
        for idx in top_indices:
            raw_score = float(scores[idx])
            if embedding_service._model is not None:
                scaled_score = max(0.0, min(1.0, raw_score))
            else:
                scaled_score = min(0.98, max(0.0, raw_score * 2.5))

            if scaled_score >= threshold:
                chunk = self._in_memory_chunks[idx]
                results.append(
                    RetrievedEvidenceItem(
                        query=query,
                        source=chunk.source,
                        section=chunk.section,
                        excerpt=chunk.text,
                        relevance_score=round(scaled_score, 2),
                        evidence_metadata=chunk.metadata,
                        conflict_id=conflict_id,
                    )
                )

        return results


retriever = VectorStoreRetriever()
