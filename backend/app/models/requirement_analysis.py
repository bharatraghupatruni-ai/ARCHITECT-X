import uuid
from datetime import datetime
from typing import Any, Dict, List, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, DateTime, JSON, ForeignKey, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project


class RequirementAnalysis(Base):
    __tablename__ = "requirement_analyses"

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
    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        index=True,
    )
    domain: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="unknown",
    )
    system_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="unknown",
    )
    scale: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    functional_requirements: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    non_functional_requirements: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    constraints: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    priorities: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    external_integrations: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    data_requirements: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    assumptions: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    ambiguities: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    missing_information: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="requirement_analyses",
    )

    def __repr__(self) -> str:
        return f"<RequirementAnalysis(id={self.id}, project_id={self.project_id}, version={self.version}, domain='{self.domain}')>"
