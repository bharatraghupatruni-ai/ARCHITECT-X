import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, JSON, ForeignKey, Integer, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.review_run import ReviewRun


class ADRRecord(Base):
    __tablename__ = "adr_records"

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
        ForeignKey("review_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    adr_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="accepted",
        index=True,
    )
    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    context: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    decision: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    consequences_positive: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    consequences_negative: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    compliance_and_security: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )
    evidence_citations: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    markdown_content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
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
        back_populates="adr_records",
    )
    review_run: Mapped[Optional["ReviewRun"]] = relationship(
        "ReviewRun",
    )

    def __repr__(self) -> str:
        return f"<ADRRecord(id={self.id}, number={self.adr_number}, title='{self.title}', status='{self.status}')>"
