import uuid
import pytest
from fastapi.testclient import TestClient

from app.requirement_engine.parser import requirement_parser
from app.agents.architecture_agent import architecture_agent
from app.agents.security_agent import security_agent
from app.agents.performance_agent import performance_agent
from app.reviewer.conflict_detector import ConflictDetector
from app.reviewer.reviewer import ReviewerAgent
from app.reviewer.schemas import (
    ReviewerOutput,
    DetectedConflict,
    ReviewRunResponse,
)


@pytest.fixture
def sample_requirement():
    return requirement_parser.analyze("Build a food delivery platform supporting 50,000 concurrent users.")


@pytest.fixture
def agent_outputs(sample_requirement):
    return {
        "architecture": architecture_agent.analyze(sample_requirement),
        "security": security_agent.analyze(sample_requirement),
        "performance": performance_agent.analyze(sample_requirement),
    }


def test_conflict_detector_identifies_tensions(agent_outputs) -> None:
    """Test that ConflictDetector discovers meaningful trade-offs and tensions across agent proposals."""
    detector = ConflictDetector()
    conflicts = detector.detect_conflicts(
        architecture_output=agent_outputs["architecture"],
        security_output=agent_outputs["security"],
        performance_output=agent_outputs["performance"],
    )

    assert isinstance(conflicts, list)
    assert len(conflicts) >= 1

    # Verify conflict structure
    for c in conflicts:
        assert isinstance(c, DetectedConflict)
        assert c.category
        assert c.conflict_type in ["disagreement", "tradeoff", "missing_decision", "risk_disagreement", "component_clash"]
        assert c.severity in ["low", "medium", "high", "critical"]
        assert len(c.description) > 10
        assert isinstance(c.agent_positions, dict)


def test_reviewer_agent_output_validation(sample_requirement, agent_outputs) -> None:
    """Test ReviewerAgent synthesizes inputs into valid ReviewerOutput with adjudicated decisions and trade-offs."""
    detector = ConflictDetector()
    conflicts = detector.detect_conflicts(
        architecture_output=agent_outputs["architecture"],
        security_output=agent_outputs["security"],
        performance_output=agent_outputs["performance"],
    )

    reviewer = ReviewerAgent()
    review_output = reviewer.review(
        requirement=sample_requirement,
        agent_outputs=agent_outputs,
        conflicts=conflicts,
    )

    assert isinstance(review_output, ReviewerOutput)
    assert review_output.overall_verdict in ["APPROVED", "APPROVED WITH CONDITIONS", "REVISE ARCHITECTURE"]
    assert len(review_output.adjudicated_decisions) >= 3
    assert len(review_output.trade_off_analysis) >= 2
    assert len(review_output.synthesis_risks) >= 2
    assert len(review_output.action_items) >= 2

    # Verify decision structure
    for decision in review_output.adjudicated_decisions:
        assert decision.category
        assert decision.chosen_option
        assert len(decision.rationale) > 15
        assert isinstance(decision.trade_offs, list)


def test_review_api_flow(client: TestClient) -> None:
    """Test end-to-end API execution of the Reviewer & Conflict Engine."""
    # 1. Create project
    create_payload = {
        "name": "Food Delivery Review Test",
        "requirement": "Build a food delivery platform supporting 50,000 concurrent users with strict transaction consistency."
    }
    create_res = client.post("/api/projects", json=create_payload)
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # 2. Check review before running -> should return null
    get_before = client.get(f"/api/projects/{project_id}/review")
    assert get_before.status_code == 200
    assert get_before.json() is None

    # 3. Attempt review before running agents -> should return 422
    premature_review = client.post(f"/api/projects/{project_id}/review")
    assert premature_review.status_code == 422
    assert "No requirement analysis found" in premature_review.json()["detail"]

    # 4. Analyze requirement
    client.post(f"/api/projects/{project_id}/analyze-requirement")

    # 5. Attempt review after requirement analysis but before agents -> should return 422
    premature_agents = client.post(f"/api/projects/{project_id}/review")
    assert premature_agents.status_code == 422
    assert "Multi-Agent review outputs are missing" in premature_agents.json()["detail"]

    # 6. Run multi-agent review
    agents_res = client.post(f"/api/projects/{project_id}/run-agents")
    assert agents_res.status_code == 200

    # 7. Run Reviewer & Conflict Engine
    review_res = client.post(f"/api/projects/{project_id}/review")
    assert review_res.status_code == 200
    data = review_res.json()

    assert data["project_id"] == project_id
    assert data["status"] == "completed"
    assert data["output"] is not None
    assert data["output"]["overall_verdict"] in ["APPROVED", "APPROVED WITH CONDITIONS", "REVISE ARCHITECTURE"]
    assert len(data["output"]["adjudicated_decisions"]) >= 3
    assert len(data["conflicts"]) >= 1

    # 8. Retrieve review via GET /api/projects/{id}/review
    get_res = client.get(f"/api/projects/{project_id}/review")
    assert get_res.status_code == 200
    fetched_data = get_res.json()
    assert fetched_data["id"] == data["id"]
    assert fetched_data["summary"] == data["summary"]
    assert len(fetched_data["conflicts"]) == len(data["conflicts"])
    assert len(fetched_data["output"]["adjudicated_decisions"]) == len(data["output"]["adjudicated_decisions"])


def test_review_nonexistent_project_404(client: TestClient) -> None:
    """Test 404 response when attempting to run review on non-existent project."""
    fake_id = str(uuid.uuid4())
    res = client.post(f"/api/projects/{fake_id}/review")
    assert res.status_code == 404
    assert f"Project with ID '{fake_id}' not found." in res.json()["detail"]
