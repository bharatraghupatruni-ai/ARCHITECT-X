"""
Traceability Validator
======================
Validates the full ARCHITECT-X pipeline chain for a given project:

  Requirement → Agent Output → Conflict → Evidence → ADR → Architecture

Returns a structured report of broken or missing links. This is used for
integrity checking and surfaced via GET /api/projects/{id}/traceability-validation.
"""

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectStatus
from app.models.requirement_analysis import RequirementAnalysis
from app.models.agent_run import AgentRun, AgentRunStatus
from app.models.review_run import ReviewRun, ArchitectureConflict
from app.models.retrieved_evidence import RetrievedEvidence
from app.models.adr_record import ADRRecord
from app.models.c4_diagram import C4Diagram

logger = logging.getLogger("architect_x.traceability")


# ---------------------------------------------------------------------------
# Data classes for the report
# ---------------------------------------------------------------------------

@dataclass
class TraceabilityLink:
    """Represents a single pipeline link check."""
    stage: str
    description: str
    status: str          # "ok" | "missing" | "warning"
    detail: Optional[str] = None


@dataclass
class TraceabilityReport:
    """Full traceability chain report for one project."""
    project_id: str
    project_name: str
    pipeline_stage_reached: str
    links: List[TraceabilityLink] = field(default_factory=list)
    broken_links_count: int = 0
    warnings_count: int = 0
    is_complete_chain: bool = False
    summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "project_id": self.project_id,
            "project_name": self.project_name,
            "pipeline_stage_reached": self.pipeline_stage_reached,
            "is_complete_chain": self.is_complete_chain,
            "broken_links_count": self.broken_links_count,
            "warnings_count": self.warnings_count,
            "summary": self.summary,
            "links": [
                {
                    "stage": lk.stage,
                    "description": lk.description,
                    "status": lk.status,
                    "detail": lk.detail,
                }
                for lk in self.links
            ],
        }


# ---------------------------------------------------------------------------
# Validator
# ---------------------------------------------------------------------------

class TraceabilityValidator:
    """Validates the full pipeline chain for an ARCHITECT-X project."""

    def validate(self, db: Session, project_id: uuid.UUID) -> TraceabilityReport:
        """Run all chain checks and return a structured report."""
        logger.info(f"Running traceability validation for project {project_id}")

        # Fetch project
        project = db.scalar(select(Project).where(Project.id == project_id))
        if not project:
            return TraceabilityReport(
                project_id=str(project_id),
                project_name="Unknown",
                pipeline_stage_reached="none",
                broken_links_count=1,
                summary="Project not found.",
                links=[
                    TraceabilityLink(
                        stage="project",
                        description="Project exists in database",
                        status="missing",
                        detail=f"No project found with id={project_id}",
                    )
                ],
            )

        report = TraceabilityReport(
            project_id=str(project_id),
            project_name=project.name,
            pipeline_stage_reached="project",
        )

        self._check_requirement(db, project, report)
        self._check_agents(db, project_id, report)
        self._check_review(db, project_id, report)
        self._check_evidence(db, project_id, report)
        self._check_adrs(db, project_id, report)
        self._check_c4_diagrams(db, project_id, report)

        # Compute summary
        broken = [lk for lk in report.links if lk.status == "missing"]
        warnings = [lk for lk in report.links if lk.status == "warning"]
        report.broken_links_count = len(broken)
        report.warnings_count = len(warnings)
        report.is_complete_chain = (len(broken) == 0)

        if report.is_complete_chain:
            report.summary = (
                f"Complete pipeline chain verified. "
                f"{len(report.links)} links checked, "
                f"{report.warnings_count} warning(s)."
            )
        else:
            broken_stages = ", ".join(lk.stage for lk in broken)
            report.summary = (
                f"Broken chain detected. "
                f"{report.broken_links_count} missing link(s) at: {broken_stages}. "
                f"Run the pipeline stages to completion first."
            )

        logger.info(
            f"Traceability validation done for project {project_id}: "
            f"complete={report.is_complete_chain}, broken={report.broken_links_count}"
        )
        return report

    # -----------------------------------------------------------------------
    # Individual stage checks
    # -----------------------------------------------------------------------

    def _check_requirement(self, db: Session, project: Project, report: TraceabilityReport) -> None:
        """Check: project has a non-empty requirement text and has been analyzed."""
        if project.requirement and project.requirement.strip():
            report.links.append(TraceabilityLink(
                stage="requirement",
                description="Project has non-empty requirement text",
                status="ok",
            ))
            report.pipeline_stage_reached = "requirement"
        else:
            report.links.append(TraceabilityLink(
                stage="requirement",
                description="Project has non-empty requirement text",
                status="missing",
                detail="Requirement text is empty. Set the requirement before running the pipeline.",
            ))
            return

        # Check: requirement has been analyzed
        analysis = db.scalar(
            select(RequirementAnalysis)
            .where(RequirementAnalysis.project_id == project.id)
            .order_by(desc(RequirementAnalysis.version))
            .limit(1)
        )
        if analysis:
            report.links.append(TraceabilityLink(
                stage="requirement_analysis",
                description="Requirement has been analyzed (RequirementAnalysis record exists)",
                status="ok",
                detail=f"version={analysis.version}",
            ))
            report.pipeline_stage_reached = "requirement_analysis"

            # Sanity check: analysis has extracted some content
            frs = analysis.functional_requirements or []
            nfrs = analysis.non_functional_requirements or []
            if not frs and not nfrs:
                report.links.append(TraceabilityLink(
                    stage="requirement_analysis_content",
                    description="Extracted FRs/NFRs are non-empty",
                    status="warning",
                    detail="Analysis exists but no FRs/NFRs were extracted. Check requirement parser.",
                ))
            else:
                report.links.append(TraceabilityLink(
                    stage="requirement_analysis_content",
                    description=f"Extracted FRs/NFRs are non-empty ({len(frs)} FRs, {len(nfrs)} NFRs)",
                    status="ok",
                ))
        else:
            report.links.append(TraceabilityLink(
                stage="requirement_analysis",
                description="Requirement has been analyzed",
                status="missing",
                detail="No RequirementAnalysis record found. Run analyze-requirement first.",
            ))

    def _check_agents(self, db: Session, project_id: uuid.UUID, report: TraceabilityReport) -> None:
        """Check: agent runs exist and completed successfully."""
        agent_runs = list(db.scalars(
            select(AgentRun).where(AgentRun.project_id == project_id)
        ))

        if not agent_runs:
            report.links.append(TraceabilityLink(
                stage="agent_runs",
                description="Multi-agent run records exist",
                status="missing",
                detail="No AgentRun records found. Run the multi-agent stage first.",
            ))
            return

        completed = [r for r in agent_runs if r.status == AgentRunStatus.COMPLETED]
        failed = [r for r in agent_runs if r.status == AgentRunStatus.FAILED]

        report.links.append(TraceabilityLink(
            stage="agent_runs",
            description=f"Agent run records exist ({len(agent_runs)} total, {len(completed)} completed)",
            status="ok" if completed else "warning",
            detail=f"failed={len(failed)}" if failed else None,
        ))
        report.pipeline_stage_reached = "agents"

        if failed:
            for fr in failed:
                report.links.append(TraceabilityLink(
                    stage="agent_run_failed",
                    description=f"Agent '{fr.agent_type}' run failed",
                    status="warning",
                    detail=fr.error_message or "No error detail captured.",
                ))

        # Check for output data in completed runs
        empty_outputs = [r for r in completed if not r.output]
        if empty_outputs:
            report.links.append(TraceabilityLink(
                stage="agent_run_output",
                description="Completed agent runs have non-empty output",
                status="warning",
                detail=f"{len(empty_outputs)} completed run(s) have no output data.",
            ))
        else:
            report.links.append(TraceabilityLink(
                stage="agent_run_output",
                description="All completed agent runs have non-empty output",
                status="ok",
            ))

    def _check_review(self, db: Session, project_id: uuid.UUID, report: TraceabilityReport) -> None:
        """Check: review run exists and conflicts were persisted."""
        review = db.scalar(
            select(ReviewRun)
            .where(ReviewRun.project_id == project_id)
            .order_by(desc(ReviewRun.created_at))
            .limit(1)
        )
        if not review:
            report.links.append(TraceabilityLink(
                stage="review_run",
                description="Review run (conflict detection) exists",
                status="missing",
                detail="No ReviewRun record found. Run the review stage first.",
            ))
            return

        report.links.append(TraceabilityLink(
            stage="review_run",
            description="Review run exists",
            status="ok",
        ))
        report.pipeline_stage_reached = "review"

        conflicts = list(db.scalars(
            select(ArchitectureConflict).where(ArchitectureConflict.review_run_id == review.id)
        ))

        if conflicts:
            report.links.append(TraceabilityLink(
                stage="conflicts",
                description=f"Conflicts detected and persisted ({len(conflicts)} total)",
                status="ok",
            ))
        else:
            report.links.append(TraceabilityLink(
                stage="conflicts",
                description="Conflicts detected by reviewer",
                status="warning",
                detail="Review completed but zero conflicts were recorded. This may be valid for simple requirements.",
            ))

    def _check_evidence(self, db: Session, project_id: uuid.UUID, report: TraceabilityReport) -> None:
        """Check: RAG evidence records exist for the project."""
        # RetrievedEvidence is stored per item row (not as a single blob)
        evidence_count = db.scalar(
            select(func.count()).select_from(RetrievedEvidence)
            .where(RetrievedEvidence.project_id == project_id)
        ) or 0

        if evidence_count == 0:
            report.links.append(TraceabilityLink(
                stage="retrieved_evidence",
                description="RAG evidence retrieval has been run",
                status="missing",
                detail="No RetrievedEvidence records found. Run retrieve-evidence first.",
            ))
            return

        report.links.append(TraceabilityLink(
            stage="retrieved_evidence",
            description=f"RAG evidence retrieved ({evidence_count} items)",
            status="ok",
        ))
        report.pipeline_stage_reached = "evidence"

    def _check_adrs(self, db: Session, project_id: uuid.UUID, report: TraceabilityReport) -> None:
        """Check: ADR records were generated."""
        adrs = list(db.scalars(
            select(ADRRecord).where(ADRRecord.project_id == project_id)
        ))

        if not adrs:
            report.links.append(TraceabilityLink(
                stage="adrs",
                description="Architecture Decision Records (ADRs) were generated",
                status="missing",
                detail="No ADRRecord found. Run the explainability stage first.",
            ))
            return

        accepted = sum(1 for a in adrs if a.status == "accepted")
        report.links.append(TraceabilityLink(
            stage="adrs",
            description=f"ADRs generated ({len(adrs)} total, {accepted} accepted)",
            status="ok",
        ))
        report.pipeline_stage_reached = "adrs"

        # Check ADR-evidence linkage via evidence_citations field
        adrs_with_citations = [a for a in adrs if a.evidence_citations and len(a.evidence_citations) > 0]
        if not adrs_with_citations:
            report.links.append(TraceabilityLink(
                stage="adr_evidence_link",
                description="ADRs are linked to evidence citations",
                status="warning",
                detail="No ADRs have evidence_citations. ADRs should trace back to RAG evidence.",
            ))
        else:
            report.links.append(TraceabilityLink(
                stage="adr_evidence_link",
                description=f"ADRs linked to evidence ({len(adrs_with_citations)}/{len(adrs)} have citations)",
                status="ok",
            ))

    def _check_c4_diagrams(self, db: Session, project_id: uuid.UUID, report: TraceabilityReport) -> None:
        """Check: C4 diagrams were generated as part of the explainability stage."""
        c4_count = db.scalar(
            select(func.count()).select_from(C4Diagram)
            .where(C4Diagram.project_id == project_id)
        ) or 0

        if c4_count == 0:
            report.links.append(TraceabilityLink(
                stage="c4_diagrams",
                description="C4 architecture diagrams were generated",
                status="missing",
                detail="No C4Diagram records found. Run the explainability stage first.",
            ))
            return

        report.links.append(TraceabilityLink(
            stage="c4_diagrams",
            description=f"C4 architecture diagrams generated ({c4_count} diagram(s))",
            status="ok",
        ))
        report.pipeline_stage_reached = "complete"

        # Check that requirements traceability can be inferred: ADRs + C4 exist
        adr_count = db.scalar(
            select(func.count()).select_from(ADRRecord)
            .where(ADRRecord.project_id == project_id)
        ) or 0
        if adr_count > 0 and c4_count > 0:
            report.links.append(TraceabilityLink(
                stage="architecture_traceability_links",
                description=f"Pipeline complete: {adr_count} ADR(s) + {c4_count} C4 diagram(s) form traceability chain",
                status="ok",
            ))
        else:
            report.links.append(TraceabilityLink(
                stage="architecture_traceability_links",
                description="Architecture traceability chain is incomplete",
                status="warning",
                detail=f"ADRs={adr_count}, C4 diagrams={c4_count}. Both are required for full traceability.",
            ))


# Singleton
traceability_validator = TraceabilityValidator()
