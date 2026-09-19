from datetime import datetime
import logging
from typing import Dict, List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, selectinload

from app.models.project import Project
from app.models.requirement_analysis import RequirementAnalysis as RequirementAnalysisModel
from app.models.agent_run import AgentRun, AgentRunStatus, AgentType
from app.models.review_run import ReviewRun, ArchitectureConflict
from app.models.retrieved_evidence import RetrievedEvidence
from app.requirement_engine.service import requirement_service
from app.agents.schemas import AgentOutput
from app.rag.schemas import RetrievedEvidenceItem
from app.rag.service import rag_service
from app.reviewer.schemas import (
    DetectedConflict,
    ReviewerOutput,
    ReviewRunResponse,
    ReviewConflictResponse,
)
from app.reviewer.conflict_detector import ConflictDetector
from app.reviewer.reviewer import ReviewerAgent

logger = logging.getLogger("architect_x.reviewer")


class ReviewerService:
    """Orchestrates conflict detection, RAG evidence retrieval, Reviewer Agent synthesis, and persistence."""

    def __init__(self):
        self.conflict_detector = ConflictDetector()
        self.reviewer_agent = ReviewerAgent()

    def run_review_for_project(
        self, db: Session, project_id: uuid.UUID
    ) -> ReviewRunResponse:
        """Fetch agent evaluations, detect conflicts, retrieve empirical RAG evidence, synthesize decisions, and persist."""
        # 1. Verify project exists
        project = db.scalar(select(Project).where(Project.id == project_id))
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        # 2. Retrieve latest requirement analysis
        latest_analysis_record = db.scalar(
            select(RequirementAnalysisModel)
            .where(RequirementAnalysisModel.project_id == project_id)
            .order_by(desc(RequirementAnalysisModel.version))
            .limit(1)
        )
        if not latest_analysis_record:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot run reviewer engine: No requirement analysis found for project '{project_id}'. Please run 'Analyze Requirements' first.",
            )

        analysis_dto = requirement_service._to_response_dto(latest_analysis_record).analysis
        req_id = latest_analysis_record.id

        # 3. Retrieve latest agent outputs
        agent_types = [AgentType.ARCHITECTURE, AgentType.SECURITY, AgentType.PERFORMANCE]
        agent_outputs: Dict[str, Optional[AgentOutput]] = {}

        for at in agent_types:
            stmt = (
                select(AgentRun)
                .where(
                    AgentRun.project_id == project_id,
                    AgentRun.agent_type == at,
                    AgentRun.status == AgentRunStatus.COMPLETED,
                )
                .order_by(desc(AgentRun.created_at))
                .limit(1)
            )
            run_record = db.scalar(stmt)
            if run_record and run_record.output:
                try:
                    agent_outputs[at] = AgentOutput.model_validate(run_record.output)
                except Exception as exc:
                    logger.warning(f"Failed to deserialize agent '{at}' output: {exc}")
                    agent_outputs[at] = None
            else:
                agent_outputs[at] = None

        # Ensure at least Architecture and one other agent have completed
        if not agent_outputs.get(AgentType.ARCHITECTURE):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Multi-Agent review outputs are missing. Please click 'Run Multi-Agent Review' first before adjudicating conflicts.",
            )

        # 4. Conflict Detection
        conflicts: List[DetectedConflict] = self.conflict_detector.detect_conflicts(
            architecture_output=agent_outputs.get(AgentType.ARCHITECTURE),
            security_output=agent_outputs.get(AgentType.SECURITY),
            performance_output=agent_outputs.get(AgentType.PERFORMANCE),
        )
        logger.info(f"ConflictDetector identified {len(conflicts)} architectural tensions/conflicts for project {project_id}")

        # 5. RAG Evidence Retrieval for Conflicts & Requirements
        evidence_queries = rag_service.generate_queries_for_conflicts(conflicts, analysis_dto)
        retrieved_evidence_items = rag_service.retrieve_evidence_for_queries(
            evidence_queries,
            top_k_per_query=2,
            threshold=0.35,
        )
        logger.info(f"RAG Engine retrieved {len(retrieved_evidence_items)} evidence excerpts for review synthesis.")

        # 6. Execute Principal Architect Reviewer Agent with Evidence Grounding
        active_outputs = {k: v for k, v in agent_outputs.items() if v is not None}
        reviewer_output: ReviewerOutput = self.reviewer_agent.review(
            requirement=analysis_dto,
            agent_outputs=active_outputs,
            conflicts=conflicts,
            evidence=retrieved_evidence_items,
        )

        # Match reviewer resolutions back to detected conflicts if applicable
        for conflict in conflicts:
            for decision in reviewer_output.adjudicated_decisions:
                if conflict.category.lower() in decision.category.lower() or decision.category.lower() in conflict.category.lower():
                    conflict.resolution = f"{decision.chosen_option}: {decision.rationale}"
                    break

        # 7. Persist ReviewRun, ArchitectureConflict, and RetrievedEvidence records
        now = datetime.utcnow()
        review_run = ReviewRun(
            id=uuid.uuid4(),
            project_id=project_id,
            requirement_analysis_id=req_id,
            status="completed",
            summary=reviewer_output.summary,
            output=reviewer_output.model_dump(mode="json"),
            created_at=now,
        )
        db.add(review_run)
        db.flush()  # Generate review_run.id for FKs

        persisted_conflicts: List[ArchitectureConflict] = []
        for c in conflicts:
            conflict_record = ArchitectureConflict(
                id=c.id or uuid.uuid4(),
                review_run_id=review_run.id,
                category=c.category,
                conflict_type=c.conflict_type,
                description=c.description,
                agent_positions=c.agent_positions,
                severity=c.severity,
                resolution=c.resolution,
                created_at=now,
            )
            db.add(conflict_record)
            persisted_conflicts.append(conflict_record)

        # Persist Retrieved Evidence
        persisted_evidence = rag_service.persist_retrieved_evidence(
            db=db,
            project_id=project_id,
            review_run_id=review_run.id,
            evidence_items=retrieved_evidence_items,
        )

        db.commit()
        db.refresh(review_run)

        logger.info(
            f"ReviewRun {review_run.id} successfully recorded with {len(persisted_conflicts)} conflicts and {len(persisted_evidence)} evidence items for project {project_id}"
        )

        return self._to_response_dto(
            review_run,
            persisted_conflicts,
            reviewer_output,
            retrieved_evidence_items,
        )

    def get_latest_review(
        self, db: Session, project_id: uuid.UUID
    ) -> Optional[ReviewRunResponse]:
        """Fetch the most recent ReviewRun for a project with conflicts and evidence."""
        project = db.scalar(select(Project).where(Project.id == project_id))
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        stmt = (
            select(ReviewRun)
            .options(
                selectinload(ReviewRun.conflicts),
                selectinload(ReviewRun.retrieved_evidence),
            )
            .where(ReviewRun.project_id == project_id)
            .order_by(desc(ReviewRun.created_at))
            .limit(1)
        )
        review_run = db.scalar(stmt)
        if not review_run:
            return None

        try:
            output_dto = ReviewerOutput.model_validate(review_run.output)
        except Exception as exc:
            logger.warning(f"Failed to deserialize review_run {review_run.id} output: {exc}")
            output_dto = None

        evidence_items = [
            RetrievedEvidenceItem(
                id=e.id,
                query=e.query,
                source=e.source,
                section=e.section,
                excerpt=e.excerpt,
                relevance_score=e.relevance_score,
                evidence_metadata=e.evidence_metadata,
                conflict_id=e.conflict_id,
                created_at=e.created_at,
            )
            for e in (review_run.retrieved_evidence or [])
        ]

        return self._to_response_dto(
            review_run,
            review_run.conflicts,
            output_dto,
            evidence_items,
        )

    def _to_response_dto(
        self,
        review_run: ReviewRun,
        conflicts: List[ArchitectureConflict],
        output_dto: Optional[ReviewerOutput],
        evidence_items: Optional[List[RetrievedEvidenceItem]] = None,
    ) -> ReviewRunResponse:
        """Map ORM models to Pydantic ReviewRunResponse."""
        conflict_dtos = [
            ReviewConflictResponse(
                id=c.id,
                review_run_id=c.review_run_id,
                category=c.category,
                conflict_type=c.conflict_type,
                description=c.description,
                agent_positions=c.agent_positions,
                severity=c.severity,
                resolution=c.resolution,
                created_at=c.created_at,
            )
            for c in conflicts
        ]

        evidence_list = evidence_items or []
        if output_dto and not output_dto.retrieved_evidence:
            output_dto.retrieved_evidence = evidence_list

        return ReviewRunResponse(
            id=review_run.id,
            project_id=review_run.project_id,
            requirement_analysis_id=review_run.requirement_analysis_id,
            status=review_run.status,
            summary=review_run.summary,
            output=output_dto,
            conflicts=conflict_dtos,
            retrieved_evidence=evidence_list,
            created_at=review_run.created_at,
        )


reviewer_service = ReviewerService()

