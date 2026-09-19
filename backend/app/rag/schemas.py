import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class EvidenceChunk(BaseModel):
    """Normalized document chunk indexed in the vector store."""
    chunk_id: str = Field(..., description="Deterministic unique identifier for this chunk.")
    source: str = Field(..., description="Document source filename (e.g., 'postgresql_architecture.md').")
    section: Optional[str] = Field(None, description="Markdown section or heading title.")
    text: str = Field(..., description="Verbatim textual content of the chunk.")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata attributes for filtering.")

    model_config = ConfigDict(from_attributes=True)


class EvidenceQuery(BaseModel):
    """Targeted query generated to substantiate an architectural decision or resolve a conflict."""
    query: str = Field(..., description="Semantic search query string.")
    conflict_id: Optional[uuid.UUID] = Field(None, description="Associated conflict identifier if applicable.")
    category: Optional[str] = Field(None, description="Architectural domain category.")
    reason: Optional[str] = Field(None, description="Why this evidence is needed.")

    model_config = ConfigDict(from_attributes=True)


class RetrievedEvidenceItem(BaseModel):
    """A retrieved technical excerpt grounded in documentation."""
    id: Optional[uuid.UUID] = Field(default=None, description="Persistent database record ID if saved.")
    query: str = Field(..., description="The search query that surfaced this evidence.")
    source: str = Field(..., description="Authoritative document source filename.")
    section: Optional[str] = Field(None, description="Document section or heading.")
    excerpt: str = Field(..., description="Relevant technical excerpt.")
    relevance_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Cosine similarity/relevance score between 0.0 and 1.0.",
    )
    evidence_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional chunk metadata (char count, tokens, tags).",
    )
    conflict_id: Optional[uuid.UUID] = Field(None, description="Associated conflict ID if linked.")
    created_at: Optional[datetime] = Field(default=None, description="Timestamp when evidence was retrieved.")

    model_config = ConfigDict(from_attributes=True)


class EvidenceRetrievalResponse(BaseModel):
    """API response summarizing RAG retrieval results for a project."""
    project_id: uuid.UUID
    review_run_id: Optional[uuid.UUID] = None
    queries_executed: List[str] = Field(default_factory=list)
    evidence_items: List[RetrievedEvidenceItem] = Field(default_factory=list)
    is_sufficient: bool = Field(
        default=True,
        description="Flag indicating whether sufficient evidence was found above the relevance threshold.",
    )
    summary: str = Field(..., description="Summary of evidence retrieved and domain coverage.")

    model_config = ConfigDict(from_attributes=True)


class IngestionSummary(BaseModel):
    """Summary of document ingestion into vector database."""
    documents_processed: int
    chunks_created: int
    sources: List[str] = Field(default_factory=list)
    status: str
    message: str

    model_config = ConfigDict(from_attributes=True)
