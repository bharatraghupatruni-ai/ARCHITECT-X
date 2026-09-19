import logging
from typing import List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectStatus
from app.models.requirement_analysis import RequirementAnalysis as RequirementAnalysisModel
from app.requirement_engine.parser import requirement_parser
from app.requirement_engine.schemas import (
    RequirementAnalysis,
    RequirementAnalysisResponse,
    Scale,
)

logger = logging.getLogger("architect_x.requirement_engine")


class RequirementEngineService:
    @staticmethod
    def analyze_project_requirement(
        db: Session, project_id: uuid.UUID
    ) -> RequirementAnalysisResponse:
        """Fetch project requirement, run requirement engine analysis, and persist structured record."""
        # 1. Retrieve project
        project = db.scalar(select(Project).where(Project.id == project_id))
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        if not project.requirement or not project.requirement.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Project requirement text is empty.",
            )

        logger.info(f"Starting requirement analysis for project {project_id} (name='{project.name}')")

        # 2. Update status to analyzing
        project.status = ProjectStatus.ANALYZING
        db.commit()

        try:
            # 3. Run Parser / LLM Analysis
            analysis = requirement_parser.analyze(project.requirement)

            # 4. Determine next version number
            latest_version_stmt = select(func.max(RequirementAnalysisModel.version)).where(
                RequirementAnalysisModel.project_id == project_id
            )
            latest_version = db.scalar(latest_version_stmt) or 0
            next_version = latest_version + 1

            # 5. Persist to DB
            db_analysis = RequirementAnalysisModel(
                project_id=project_id,
                version=next_version,
                domain=analysis.domain,
                system_type=analysis.system_type,
                scale=analysis.scale.model_dump(),
                functional_requirements=analysis.functional_requirements,
                non_functional_requirements=analysis.non_functional_requirements,
                constraints=analysis.constraints,
                priorities=analysis.priorities,
                external_integrations=analysis.external_integrations,
                data_requirements=analysis.data_requirements,
                assumptions=analysis.assumptions,
                ambiguities=analysis.ambiguities,
                missing_information=analysis.missing_information,
                confidence=analysis.confidence,
            )
            db.add(db_analysis)

            # 6. Update project status
            project.status = ProjectStatus.COMPLETED
            db.commit()
            db.refresh(db_analysis)

            logger.info(
                f"Requirement analysis v{next_version} saved for project {project_id} (id={db_analysis.id})"
            )

            return RequirementEngineService._to_response_dto(db_analysis)

        except HTTPException:
            project.status = ProjectStatus.FAILED
            db.commit()
            raise
        except Exception as exc:
            project.status = ProjectStatus.FAILED
            db.commit()
            logger.error(f"Requirement analysis failed for project {project_id}: {exc}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Requirement analysis failed: {str(exc)}",
            )

    @staticmethod
    def get_latest_analysis(
        db: Session, project_id: uuid.UUID
    ) -> Optional[RequirementAnalysisResponse]:
        """Fetch the most recent requirement analysis version for a project."""
        stmt = (
            select(RequirementAnalysisModel)
            .where(RequirementAnalysisModel.project_id == project_id)
            .order_by(desc(RequirementAnalysisModel.version))
            .limit(1)
        )
        record = db.scalar(stmt)
        if not record:
            return None
        return RequirementEngineService._to_response_dto(record)

    @staticmethod
    def list_analyses_for_project(
        db: Session, project_id: uuid.UUID
    ) -> List[RequirementAnalysisResponse]:
        """List all analysis versions for a project."""
        stmt = (
            select(RequirementAnalysisModel)
            .where(RequirementAnalysisModel.project_id == project_id)
            .order_by(desc(RequirementAnalysisModel.version))
        )
        records = db.scalars(stmt).all()
        return [RequirementEngineService._to_response_dto(r) for r in records]

    @staticmethod
    def _to_response_dto(record: RequirementAnalysisModel) -> RequirementAnalysisResponse:
        """Convert ORM model to API response schema."""
        scale_obj = Scale(**(record.scale or {}))
        analysis = RequirementAnalysis(
            domain=record.domain,
            system_type=record.system_type,
            scale=scale_obj,
            functional_requirements=record.functional_requirements or [],
            non_functional_requirements=record.non_functional_requirements or [],
            constraints=record.constraints or [],
            priorities=record.priorities or [],
            external_integrations=record.external_integrations or [],
            data_requirements=record.data_requirements or [],
            assumptions=record.assumptions or [],
            ambiguities=record.ambiguities or [],
            missing_information=record.missing_information or [],
            confidence=record.confidence,
        )
        return RequirementAnalysisResponse(
            project_id=record.project_id,
            analysis_id=record.id,
            version=record.version,
            analysis=analysis,
            created_at=record.created_at,
        )


requirement_service = RequirementEngineService()
