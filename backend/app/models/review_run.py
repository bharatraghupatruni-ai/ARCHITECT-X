import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, JSON, ForeignKey, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.requirement_analysis import RequirementAnalysis
    from app.models.retrieved_evidence import RetrievedEvidence


class ReviewRun(Base):
    __tablename__ = "review_runs"

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
    requirement_analysis_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("requirement_analyses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="completed",
        index=True,
    )
    summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    output: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
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
        back_populates="review_runs",
    )
    requirement_analysis: Mapped["RequirementAnalysis"] = relationship(
        "RequirementAnalysis",
    )
    conflicts: Mapped[List["ArchitectureConflict"]] = relationship(
        "ArchitectureConflict",
        back_populates="review_run",
        cascade="all, delete-orphan",
    )
    retrieved_evidence: Mapped[List["RetrievedEvidence"]] = relationship(
        "RetrievedEvidence",
        back_populates="review_run",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<ReviewRun(id={self.id}, project_id={self.project_id}, status='{self.status}')>"


class ArchitectureConflict(Base):
    __tablename__ = "architecture_conflicts"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    review_run_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("review_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    conflict_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    agent_positions: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="medium",
    )
    resolution: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    review_run: Mapped["ReviewRun"] = relationship(
        "ReviewRun",
        back_populates="conflicts",
    )

    def __repr__(self) -> str:
        return f"<ArchitectureConflict(id={self.id}, category='{self.category}', type='{self.conflict_type}')>"
