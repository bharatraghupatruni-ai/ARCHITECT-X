import concurrent.futures
from datetime import datetime
import logging
from typing import Dict, Optional, Tuple
import uuid
from fastapi import HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.requirement_analysis import RequirementAnalysis as RequirementAnalysisModel
from app.models.agent_run import AgentRun, AgentRunStatus, AgentType
from app.requirement_engine.service import requirement_service
from app.requirement_engine.schemas import RequirementAnalysis
from app.agents.architecture_agent import architecture_agent
from app.agents.security_agent import security_agent
from app.agents.performance_agent import performance_agent
from app.agents.schemas import (
    AgentOutput,
    ProjectAgentResultsResponse,
)

logger = logging.getLogger("architect_x.agents")


class MultiAgentService:
    """Service orchestrating concurrent, independent execution and persistence of specialized AI agents."""

    @staticmethod
    def run_agents_for_project(
        db: Session, project_id: uuid.UUID
    ) -> ProjectAgentResultsResponse:
        """Fetch latest requirement analysis, execute the 3 agents concurrently, and persist results."""
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
                detail=f"Cannot run architecture review: No requirement analysis found for project '{project_id}'. Please run 'Analyze Requirements' first.",
            )

        # Convert to Pydantic schema for agent input
        analysis_dto = requirement_service._to_response_dto(latest_analysis_record).analysis
        req_id = latest_analysis_record.id

        logger.info(
            f"Starting Multi-Agent Architecture Review for project {project_id} (requirement_analysis_id={req_id}, domain={analysis_dto.domain})"
        )

        # 3. Concurrent Agent Execution
        agents = {
            AgentType.ARCHITECTURE: architecture_agent,
            AgentType.SECURITY: security_agent,
            AgentType.PERFORMANCE: performance_agent,
        }

        results: Dict[str, Tuple[Optional[AgentOutput], Optional[str]]] = {}

        def _execute_agent(agent_type: str, agent_instance) -> Tuple[str, Optional[AgentOutput], Optional[str]]:
            try:
                out = agent_instance.analyze(analysis_dto)
                return agent_type, out, None
            except Exception as exc:
                logger.error(f"Agent '{agent_type}' execution failed: {exc}", exc_info=True)
                return agent_type, None, str(exc)

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            future_to_agent = {
                executor.submit(_execute_agent, at, instance): at
                for at, instance in agents.items()
            }
            for future in concurrent.futures.as_completed(future_to_agent):
                agent_type, output, error_msg = future.result()
                results[agent_type] = (output, error_msg)

        # 4. Persist each agent run into the database
        created_runs: Dict[str, AgentRun] = {}
        now = datetime.utcnow()

        for agent_type, (output, error_msg) in results.items():
            run_status = AgentRunStatus.COMPLETED if output is not None else AgentRunStatus.FAILED
            db_run = AgentRun(
                project_id=project_id,
                requirement_analysis_id=req_id,
                agent_type=agent_type,
                status=run_status,
                output=output.model_dump() if output else None,
                error_message=error_msg,
                created_at=now,
            )
            db.add(db_run)
            created_runs[agent_type] = db_run

        db.commit()

        # 5. Formulate consolidated response
        arch_out, _ = results.get(AgentType.ARCHITECTURE, (None, None))
        sec_out, _ = results.get(AgentType.SECURITY, (None, None))
        perf_out, _ = results.get(AgentType.PERFORMANCE, (None, None))

        all_success = all(output is not None for output, _ in results.values())
        overall_status = "ready" if all_success else "partial" if any(output is not None for output, _ in results.values()) else "failed"

        logger.info(
            f"Multi-Agent review completed for project {project_id} (status={overall_status})"
        )

        return ProjectAgentResultsResponse(
            project_id=project_id,
            requirement_analysis_id=req_id,
            status=overall_status,
            architecture=arch_out,
            security=sec_out,
            performance=perf_out,
            created_at=now,
        )

    @staticmethod
    def get_project_agent_results(
        db: Session, project_id: uuid.UUID
    ) -> ProjectAgentResultsResponse:
        """Retrieve the most recent evaluation output from each specialized AI agent."""
        project = db.scalar(select(Project).where(Project.id == project_id))
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        agent_types = [AgentType.ARCHITECTURE, AgentType.SECURITY, AgentType.PERFORMANCE]
        latest_outputs: Dict[str, Optional[AgentOutput]] = {}
        latest_req_id: Optional[uuid.UUID] = None
        latest_timestamp: Optional[datetime] = None

        for at in agent_types:
            stmt = (
                select(AgentRun)
                .where(AgentRun.project_id == project_id, AgentRun.agent_type == at)
                .order_by(desc(AgentRun.created_at))
                .limit(1)
            )
            run_record = db.scalar(stmt)
            if run_record and run_record.status == AgentRunStatus.COMPLETED and run_record.output:
                try:
                    latest_outputs[at] = AgentOutput.model_validate(run_record.output)
                    latest_req_id = run_record.requirement_analysis_id
                    if not latest_timestamp or run_record.created_at > latest_timestamp:
                        latest_timestamp = run_record.created_at
                except Exception as exc:
                    logger.warning(f"Failed to deserialize agent '{at}' output for project {project_id}: {exc}")
                    latest_outputs[at] = None
            else:
                latest_outputs[at] = None

        has_any = any(v is not None for v in latest_outputs.values())
        all_ready = all(v is not None for v in latest_outputs.values())

        if not has_any:
            return ProjectAgentResultsResponse(
                project_id=project_id,
                requirement_analysis_id=None,
                status="not_run",
                architecture=None,
                security=None,
                performance=None,
                created_at=None,
            )

        return ProjectAgentResultsResponse(
            project_id=project_id,
            requirement_analysis_id=latest_req_id,
            status="ready" if all_ready else "partial",
            architecture=latest_outputs.get(AgentType.ARCHITECTURE),
            security=latest_outputs.get(AgentType.SECURITY),
            performance=latest_outputs.get(AgentType.PERFORMANCE),
            created_at=latest_timestamp,
        )


multi_agent_service = MultiAgentService()
