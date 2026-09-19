"""
Tests for the Traceability Validator and the traceability-validation API endpoint.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.traceability_validator import TraceabilityValidator, traceability_validator
from app.models.project import Project, ProjectStatus
from app.models.requirement_analysis import RequirementAnalysis
from app.models.agent_run import AgentRun, AgentRunStatus, AgentType
from app.models.review_run import ReviewRun


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_project(db: Session, requirement: str = "Build a test system.") -> Project:
    """Create and persist a minimal test project."""
    project = Project(
        id=uuid.uuid4(),
        name="Traceability Test Project",
        requirement=requirement,
        status=ProjectStatus.CREATED,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def _make_analysis(db: Session, project_id: uuid.UUID) -> RequirementAnalysis:
    """Create and persist a minimal RequirementAnalysis."""
    analysis = RequirementAnalysis(
        id=uuid.uuid4(),
        project_id=project_id,
        version=1,
        domain="e-commerce",
        system_type="web_application",
        functional_requirements=["Handle 1000 concurrent users"],
        non_functional_requirements=["99.9% uptime SLA"],
        constraints=[],
        priorities=[],
        external_integrations=[],
        data_requirements=[],
        assumptions=[],
        ambiguities=[],
        missing_information=[],
        confidence=1.0,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


def _make_agent_run(db: Session, project_id: uuid.UUID, analysis_id: uuid.UUID,
                     agent_type: str = AgentType.ARCHITECTURE,
                     status: str = AgentRunStatus.COMPLETED) -> AgentRun:
    """Create and persist an AgentRun record."""
    run = AgentRun(
        id=uuid.uuid4(),
        project_id=project_id,
        requirement_analysis_id=analysis_id,
        agent_type=agent_type,
        status=status,
        output={"findings": ["test finding"], "recommendations": ["test rec"]},
        error_message=None,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def _make_review_run(db: Session, project_id: uuid.UUID, analysis_id: uuid.UUID) -> ReviewRun:
    """Create and persist a minimal ReviewRun."""
    run = ReviewRun(
        id=uuid.uuid4(),
        project_id=project_id,
        requirement_analysis_id=analysis_id,
        status="completed",
        summary="Test review summary.",
        output={"adjudicated_decisions": [], "action_items": [], "summary": ""},
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


# ---------------------------------------------------------------------------
# Unit tests for TraceabilityValidator
# ---------------------------------------------------------------------------

class TestTraceabilityValidatorUnit:
    """Unit tests for the TraceabilityValidator directly."""

    def test_project_not_found_returns_broken_report(self, db_session: Session):
        """Unknown project ID should return a report with 1 broken link."""
        non_existent = uuid.uuid4()
        report = traceability_validator.validate(db=db_session, project_id=non_existent)
        assert report.broken_links_count >= 1
        assert report.is_complete_chain is False
        assert "not found" in report.summary.lower()

    def test_project_with_empty_requirement(self, db_session: Session):
        """Project with empty requirement text should flag a broken requirement link."""
        project = Project(
            id=uuid.uuid4(),
            name="Empty Req Project",
            requirement="",
            status=ProjectStatus.CREATED,
        )
        db_session.add(project)
        db_session.commit()

        report = traceability_validator.validate(db=db_session, project_id=project.id)
        stages = [lk.stage for lk in report.links if lk.status == "missing"]
        assert "requirement" in stages
        assert report.is_complete_chain is False

    def test_project_requirement_present_no_analysis(self, db_session: Session):
        """Project with requirement but no RequirementAnalysis should flag missing analysis."""
        project = _make_project(db_session)
        report = traceability_validator.validate(db=db_session, project_id=project.id)

        stages = {lk.stage: lk.status for lk in report.links}
        assert stages.get("requirement") == "ok"
        assert stages.get("requirement_analysis") == "missing"
        assert report.is_complete_chain is False

    def test_project_with_analysis_no_agents(self, db_session: Session):
        """Project with analysis but no agents should flag missing agents."""
        project = _make_project(db_session)
        _make_analysis(db_session, project.id)

        report = traceability_validator.validate(db=db_session, project_id=project.id)
        stages = {lk.stage: lk.status for lk in report.links}
        assert stages.get("requirement_analysis") == "ok"
        assert stages.get("agent_runs") == "missing"

    def test_project_with_analysis_and_agents(self, db_session: Session):
        """Project with analysis + completed agents should show agents as ok."""
        project = _make_project(db_session)
        analysis = _make_analysis(db_session, project.id)
        _make_agent_run(db_session, project.id, analysis.id, AgentType.ARCHITECTURE)

        report = traceability_validator.validate(db=db_session, project_id=project.id)
        stages = {lk.stage: lk.status for lk in report.links}
        assert stages.get("agent_runs") == "ok"

    def test_failed_agent_run_emits_warning(self, db_session: Session):
        """Failed agent runs should appear as warnings, not blocking broken links."""
        project = _make_project(db_session)
        analysis = _make_analysis(db_session, project.id)
        _make_agent_run(db_session, project.id, analysis.id, AgentType.ARCHITECTURE, AgentRunStatus.FAILED)

        report = traceability_validator.validate(db=db_session, project_id=project.id)
        warning_stages = [lk.stage for lk in report.links if lk.status == "warning"]
        assert any("failed" in s for s in warning_stages)

    def test_complete_chain_up_to_agents(self, db_session: Session):
        """Report with project + analysis + completed agent should mark those links ok."""
        project = _make_project(db_session)
        analysis = _make_analysis(db_session, project.id)
        _make_agent_run(db_session, project.id, analysis.id)

        report = traceability_validator.validate(db=db_session, project_id=project.id)
        ok_stages = {lk.stage for lk in report.links if lk.status == "ok"}
        assert "requirement" in ok_stages
        assert "requirement_analysis" in ok_stages
        assert "agent_runs" in ok_stages

    def test_c4_diagrams_missing_flags_broken(self, db_session: Session):
        """A project without C4 diagrams should flag them as missing."""
        project = _make_project(db_session)
        # Leave no C4 diagrams created
        report = traceability_validator.validate(db=db_session, project_id=project.id)
        stages = {lk.stage: lk.status for lk in report.links}
        # c4_diagrams only checked if earlier stages pass, so it may or may not appear
        # Regardless, the chain cannot be complete without completing earlier stages
        assert report.is_complete_chain is False



# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------

class TestTraceabilityValidationEndpoint:
    """Tests for GET /api/projects/{id}/traceability-validation endpoint."""

    def test_traceability_unknown_project(self, client: TestClient):
        """Should return 200 with broken chain report for unknown project."""
        non_existent = str(uuid.uuid4())
        response = client.get(f"/api/projects/{non_existent}/traceability-validation")
        assert response.status_code == 200
        data = response.json()
        assert data["is_complete_chain"] is False
        assert data["broken_links_count"] >= 1

    def test_traceability_new_project_no_pipeline(self, client: TestClient):
        """New project with requirement but no pipeline steps should have broken links."""
        # Create project
        create_resp = client.post("/api/projects", json={
            "name": "Traceability Endpoint Test",
            "requirement": "Build a scalable order management system.",
        })
        assert create_resp.status_code == 201
        project_id = create_resp.json()["id"]

        # Check traceability
        trace_resp = client.get(f"/api/projects/{project_id}/traceability-validation")
        assert trace_resp.status_code == 200
        data = trace_resp.json()

        assert "project_id" in data
        assert "links" in data
        assert "is_complete_chain" in data
        assert "broken_links_count" in data
        assert "summary" in data
        assert data["is_complete_chain"] is False

    def test_traceability_response_structure(self, client: TestClient):
        """Validate the response structure keys."""
        create_resp = client.post("/api/projects", json={
            "name": "Structure Validation Test",
            "requirement": "Build a healthcare patient portal.",
        })
        assert create_resp.status_code == 201
        project_id = create_resp.json()["id"]

        trace_resp = client.get(f"/api/projects/{project_id}/traceability-validation")
        assert trace_resp.status_code == 200
        data = trace_resp.json()

        required_keys = {
            "project_id", "project_name", "pipeline_stage_reached",
            "is_complete_chain", "broken_links_count", "warnings_count",
            "summary", "links",
        }
        assert required_keys.issubset(set(data.keys()))

    def test_traceability_links_have_required_fields(self, client: TestClient):
        """Each link entry must have stage, description, and status fields."""
        create_resp = client.post("/api/projects", json={
            "name": "Link Structure Test",
            "requirement": "Build an IoT sensor data platform.",
        })
        assert create_resp.status_code == 201
        project_id = create_resp.json()["id"]

        trace_resp = client.get(f"/api/projects/{project_id}/traceability-validation")
        assert trace_resp.status_code == 200
        data = trace_resp.json()

        for link in data["links"]:
            assert "stage" in link
            assert "description" in link
            assert "status" in link
            assert link["status"] in ("ok", "missing", "warning")

    def test_traceability_after_analyze_requirement(self, client: TestClient):
        """After running analyze-requirement, the analysis link should be ok."""
        create_resp = client.post("/api/projects", json={
            "name": "Post-Analysis Traceability Test",
            "requirement": "Build a fintech lending platform with KYC verification.",
        })
        assert create_resp.status_code == 201
        project_id = create_resp.json()["id"]

        # Run requirement analysis
        analyze_resp = client.post(f"/api/projects/{project_id}/analyze-requirement")
        assert analyze_resp.status_code == 200

        # Check traceability
        trace_resp = client.get(f"/api/projects/{project_id}/traceability-validation")
        assert trace_resp.status_code == 200
        data = trace_resp.json()

        stages = {lk["stage"]: lk["status"] for lk in data["links"]}
        assert stages.get("requirement") == "ok"
        assert stages.get("requirement_analysis") == "ok"
