import uuid
from datetime import datetime
from typing import Any, Dict, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, JSON, Float, ForeignKey, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.review_run import ReviewRun, ArchitectureConflict


class RetrievedEvidence(Base):
    __tablename__ = "retrieved_evidence"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    review_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("review_runs.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    conflict_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("architecture_conflicts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    query: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    source: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    section: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    excerpt: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    evidence_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    relevance_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="retrieved_evidence",
    )
    review_run: Mapped[Optional["ReviewRun"]] = relationship(
        "ReviewRun",
        back_populates="retrieved_evidence",
    )
    conflict: Mapped[Optional["ArchitectureConflict"]] = relationship(
        "ArchitectureConflict",
    )

    def __repr__(self) -> str:
        return f"<RetrievedEvidence(id={self.id}, source='{self.source}', score={self.relevance_score:.2f})>"
