import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.requirement_analysis import RequirementAnalysis
    from app.models.agent_run import AgentRun
    from app.models.review_run import ReviewRun
    from app.models.retrieved_evidence import RetrievedEvidence
    from app.models.adr_record import ADRRecord
    from app.models.c4_diagram import C4Diagram
    from app.models.challenge_run import ChallengeRun


class ProjectStatus:
    CREATED = "created"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    requirement: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=ProjectStatus.CREATED,
        index=True,
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
    requirement_analyses: Mapped[list["RequirementAnalysis"]] = relationship(
        "RequirementAnalysis",
        back_populates="project",
        order_by="desc(RequirementAnalysis.version)",
        cascade="all, delete-orphan",
    )
    agent_runs: Mapped[list["AgentRun"]] = relationship(
        "AgentRun",
        back_populates="project",
        order_by="desc(AgentRun.created_at)",
        cascade="all, delete-orphan",
    )
    review_runs: Mapped[list["ReviewRun"]] = relationship(
        "ReviewRun",
        back_populates="project",
        order_by="desc(ReviewRun.created_at)",
        cascade="all, delete-orphan",
    )
    retrieved_evidence: Mapped[list["RetrievedEvidence"]] = relationship(
        "RetrievedEvidence",
        back_populates="project",
        order_by="desc(RetrievedEvidence.created_at)",
        cascade="all, delete-orphan",
    )
    adr_records: Mapped[list["ADRRecord"]] = relationship(
        "ADRRecord",
        back_populates="project",
        order_by="ADRRecord.adr_number",
        cascade="all, delete-orphan",
    )
    c4_diagrams: Mapped[list["C4Diagram"]] = relationship(
        "C4Diagram",
        back_populates="project",
        order_by="desc(C4Diagram.created_at)",
        cascade="all, delete-orphan",
    )
    challenge_runs: Mapped[list["ChallengeRun"]] = relationship(
        "ChallengeRun",
        back_populates="project",
        order_by="desc(ChallengeRun.created_at)",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}', status='{self.status}')>"


