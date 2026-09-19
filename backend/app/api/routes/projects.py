from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectResponse
from app.services.project_service import project_service
from app.requirement_engine.schemas import RequirementAnalysisResponse
from app.requirement_engine.service import requirement_service
from app.agents.schemas import ProjectAgentResultsResponse
from app.agents.service import multi_agent_service
from app.rag.schemas import EvidenceRetrievalResponse
from app.rag.service import rag_service
from app.reviewer.schemas import ReviewRunResponse
from app.reviewer.service import reviewer_service
from app.explainability.schemas import (
    ExplainabilityResponse,
    ADRExportResponse,
)
from app.explainability.service import explainability_service
from app.architecture.schemas import UnifiedArchitectureResponse
from app.architecture.service import architecture_service
from app.challenge.schemas import (
    ChallengeScenario,
    ChallengeRequest,
    ChallengeRunResponse,
)
from app.challenge.service import challenge_service
from app.services.traceability_validator import traceability_validator

router = APIRouter()





@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Architecture Project",
    description="Create a new software architecture project with system requirements.",
)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
) -> ProjectResponse:
    """Create a project and persist to database."""
    project = project_service.create_project(db=db, project_in=project_in)
    return ProjectResponse.model_validate(project)


@router.get(
    "",
    response_model=List[ProjectResponse],
    summary="List Projects",
    description="Retrieve all architecture review projects ordered by most recent first.",
)
def list_projects(
    skip: int = Query(0, ge=0, description="Pagination skip offset"),
    limit: int = Query(100, ge=1, le=100, description="Pagination limit"),
    db: Session = Depends(get_db),
) -> List[ProjectResponse]:
    """List projects."""
    projects, _ = project_service.list_projects(db=db, skip=skip, limit=limit)
    return [ProjectResponse.model_validate(p) for p in projects]


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get Project by ID",
    description="Retrieve specific project details by project UUID.",
)
def get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ProjectResponse:
    """Get project by UUID."""
    project = project_service.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found.",
        )
    return ProjectResponse.model_validate(project)


@router.post(
    "/{project_id}/analyze-requirement",
    response_model=RequirementAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze Project Requirements",
    description="Invoke the Requirement Engine to parse raw system requirements into structured engineering specifications.",
)
def analyze_project_requirement(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> RequirementAnalysisResponse:
    """Trigger requirement analysis for a project."""
    return requirement_service.analyze_project_requirement(db=db, project_id=project_id)


@router.get(
    "/{project_id}/analyses",
    response_model=List[RequirementAnalysisResponse],
    summary="List Project Analyses",
    description="Retrieve all requirement analysis versions generated for a specific project.",
)
def list_project_analyses(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> List[RequirementAnalysisResponse]:
    """List all requirement analysis versions for a project."""
    project = project_service.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found.",
        )
    return requirement_service.list_analyses_for_project(db=db, project_id=project_id)


@router.get(
    "/{project_id}/latest-analysis",
    response_model=RequirementAnalysisResponse,
    summary="Get Latest Requirement Analysis",
    description="Retrieve the most recent requirement analysis version for a project.",
)
def get_latest_project_analysis(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> RequirementAnalysisResponse:
    """Get the latest requirement analysis for a project."""
    project = project_service.get_project_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found.",
        )
    latest = requirement_service.get_latest_analysis(db=db, project_id=project_id)
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No requirement analysis found for project '{project_id}'.",
        )
    return latest


@router.post(
    "/{project_id}/run-agents",
    response_model=ProjectAgentResultsResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Multi-Agent Architecture Review",
    description="Concurrently execute the Architecture Agent, Security Agent, and Performance Agent against the latest structured requirement.",
)
def run_agents_for_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ProjectAgentResultsResponse:
    """Trigger parallel multi-agent evaluation for a project."""
    return multi_agent_service.run_agents_for_project(db=db, project_id=project_id)


@router.get(
    "/{project_id}/agent-results",
    response_model=ProjectAgentResultsResponse,
    summary="Get Project Agent Evaluation Results",
    description="Retrieve the latest evaluation outputs from Architecture, Security, and Performance agents.",
)
def get_project_agent_results(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ProjectAgentResultsResponse:
    """Get latest multi-agent results for a project."""
    return multi_agent_service.get_project_agent_results(db=db, project_id=project_id)


@router.post(
    "/{project_id}/review",
    response_model=ReviewRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Reviewer & Conflict Engine",
    description="Synthesize multi-agent outputs, detect architectural conflicts, trade-offs, and risk disagreements, and generate adjudicated Principal Architect decisions.",
)
def run_project_review(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ReviewRunResponse:
    """Trigger reviewer synthesis and conflict detection for a project."""
    return reviewer_service.run_review_for_project(db=db, project_id=project_id)


@router.get(
    "/{project_id}/review",
    response_model=Optional[ReviewRunResponse],
    summary="Get Latest Architecture Review",
    description="Retrieve the latest Reviewer & Conflict Engine results for a project, including detected conflicts and adjudicated decisions.",
)
def get_latest_project_review(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Optional[ReviewRunResponse]:
    """Get latest architecture review results for a project."""
    return reviewer_service.get_latest_review(db=db, project_id=project_id)


@router.post(
    "/{project_id}/retrieve-evidence",
    response_model=EvidenceRetrievalResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve Technical Literature Evidence (RAG)",
    description="Generate targeted queries and retrieve empirical technical documentation and benchmark evidence for project conflicts.",
)
def retrieve_project_evidence(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> EvidenceRetrievalResponse:
    """Retrieve technical evidence grounded in documentation for a project."""
    return rag_service.retrieve_evidence_for_project(db=db, project_id=project_id)


@router.post(
    "/{project_id}/explainability",
    response_model=ExplainabilityResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Architecture Decision Records (ADRs) & C4 Diagrams",
    description="Synthesize formalized MADR-compliant ADRs and interactive 3-tier C4 Model Diagrams grounded in multi-agent review and empirical evidence.",
)
def generate_project_explainability(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ExplainabilityResponse:
    """Generate ADRs and C4 diagrams for a project."""
    return explainability_service.generate_explainability_for_project(db=db, project_id=project_id)


@router.get(
    "/{project_id}/explainability",
    response_model=Optional[ExplainabilityResponse],
    summary="Get Latest Explainability Artifacts",
    description="Retrieve existing Architecture Decision Records (ADRs) and C4 Diagrams for a project.",
)
def get_project_explainability(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Optional[ExplainabilityResponse]:
    """Get latest explainability results for a project."""
    return explainability_service.get_latest_explainability(db=db, project_id=project_id)


@router.get(
    "/{project_id}/adr/export",
    response_model=ADRExportResponse,
    summary="Export All ADRs as Bundled Markdown",
    description="Export all synthesized Architecture Decision Records as a single formatted markdown document for documentation repositories.",
)
def export_project_adrs(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ADRExportResponse:
    """Export all ADRs in markdown format."""
    return explainability_service.export_adrs_markdown(db=db, project_id=project_id)


@router.get(
    "/{project_id}/architecture",
    response_model=UnifiedArchitectureResponse,
    summary="Get Unified Architecture Workspace Model",
    description="Retrieve the unified normalized architecture model containing components, connections, technologies, security boundaries, decisions, and end-to-end requirement traceability.",
)
def get_project_architecture(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> UnifiedArchitectureResponse:
    """Retrieve normalized architecture and traceability matrix for a project."""
    return architecture_service.get_unified_architecture(db=db, project_id=project_id)


@router.get(
    "/{project_id}/challenge-scenarios",
    response_model=List[ChallengeScenario],
    summary="Get Available Architecture Challenge Scenarios",
    description="Retrieve all pre-defined realistic failure, scalability, and distributed inconsistency challenge scenarios.",
)
def get_challenge_scenarios(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> List[ChallengeScenario]:
    """List all available architecture challenge scenarios."""
    return challenge_service.get_scenarios()


@router.post(
    "/{project_id}/challenge",
    response_model=ChallengeRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Architecture Challenge Simulation",
    description="Challenge the synthesized architecture against a realistic failure or scale scenario and obtain an AI impact analysis.",
)
def run_architecture_challenge(
    project_id: uuid.UUID,
    challenge_in: ChallengeRequest,
    db: Session = Depends(get_db),
) -> ChallengeRunResponse:
    """Execute scenario simulation on the project architecture."""
    return challenge_service.run_challenge(
        db=db,
        project_id=project_id,
        scenario_id=challenge_in.scenario_id,
    )


@router.get(
    "/{project_id}/challenges",
    response_model=List[ChallengeRunResponse],
    summary="Get Project Challenge Run History",
    description="Retrieve all past challenge simulations and impact evaluations executed for this project.",
)
def list_project_challenges(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> List[ChallengeRunResponse]:
    """List historical challenge runs for a project."""
    return challenge_service.list_challenge_runs(db=db, project_id=project_id)


@router.get(
    "/{project_id}/challenges/{challenge_id}",
    response_model=ChallengeRunResponse,
    summary="Get Specific Challenge Run",
    description="Retrieve full details and impact breakdown of a specific challenge run.",
)
def get_project_challenge_detail(
    project_id: uuid.UUID,
    challenge_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ChallengeRunResponse:
    """Retrieve a single challenge simulation result."""
    return challenge_service.get_challenge_run(
        db=db,
        project_id=project_id,
        challenge_id=challenge_id,
    )


@router.get(
    "/{project_id}/traceability-validation",
    summary="Validate Architecture Pipeline Chain",
    description=(
        "Validate the full pipeline traceability chain for a project: "
        "Requirement → Agent Output → Conflict → Evidence → ADR → Architecture Component. "
        "Returns a structured report of present, missing, and warning links."
    ),
)
def validate_project_traceability(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Run traceability chain validation and return structured report."""
    report = traceability_validator.validate(db=db, project_id=project_id)
    return report.to_dict()

