import uuid
import pytest
from fastapi.testclient import TestClient

from app.agents.architecture_agent import architecture_agent
from app.agents.security_agent import security_agent
from app.agents.performance_agent import performance_agent
from app.agents.schemas import AgentOutput, ProjectAgentResultsResponse
from app.requirement_engine.parser import requirement_parser


@pytest.fixture
def sample_requirement():
    return requirement_parser.analyze("Build a food delivery platform supporting 50,000 concurrent users.")


def test_architecture_agent_output_validation(sample_requirement) -> None:
    """Test ArchitectureAgent produces valid AgentOutput with system topology and database decisions."""
    output = architecture_agent.analyze(sample_requirement)

    assert isinstance(output, AgentOutput)
    assert output.agent_type == "architecture"
    assert len(output.decisions) >= 3
    assert len(output.components) >= 3
    assert len(output.connections) >= 2
    assert len(output.risks) >= 1

    # Check for architectural decisions
    decision_names = [d.decision.lower() for d in output.decisions]
    assert any("database" in d or "persistence" in d for d in decision_names)
    assert any("architectural style" in d or "topology" in d for d in decision_names)


def test_security_agent_output_validation(sample_requirement) -> None:
    """Test SecurityAgent produces valid AgentOutput with zero-trust auth and encryption decisions."""
    output = security_agent.analyze(sample_requirement)

    assert isinstance(output, AgentOutput)
    assert output.agent_type == "security"
    assert len(output.decisions) >= 3
    assert len(output.risks) >= 2
    assert len(output.recommendations) >= 2

    # Check for security decisions
    decision_names = [d.decision.lower() for d in output.decisions]
    assert any("authentication" in d or "auth" in d for d in decision_names)
    assert any("encryption" in d or "protection" in d or "zero-trust" in d for d in decision_names)


def test_performance_agent_output_validation(sample_requirement) -> None:
    """Test PerformanceAgent produces valid AgentOutput with caching, queuing, and bottleneck analysis."""
    output = performance_agent.analyze(sample_requirement)

    assert isinstance(output, AgentOutput)
    assert output.agent_type == "performance"
    assert len(output.decisions) >= 3
    assert len(output.risks) >= 2
    assert len(output.components) >= 3

    # Check for performance decisions
    decision_names = [d.decision.lower() for d in output.decisions]
    assert any("caching" in d or "cache" in d for d in decision_names)
    assert any("queue" in d or "asynchronous" in d or "resilience" in d for d in decision_names)


def test_agents_produce_distinct_non_identical_outputs(sample_requirement) -> None:
    """Test that all three agents provide distinct, specialized proposals (crucial for Phase 4 conflict detection)."""
    arch = architecture_agent.analyze(sample_requirement)
    sec = security_agent.analyze(sample_requirement)
    perf = performance_agent.analyze(sample_requirement)

    assert arch.agent_type != sec.agent_type
    assert sec.agent_type != perf.agent_type

    arch_choices = {d.choice for d in arch.decisions}
    sec_choices = {d.choice for d in sec.decisions}
    perf_choices = {d.choice for d in perf.decisions}

    # Verify specialized separation of concerns
    assert arch_choices != sec_choices
    assert sec_choices != perf_choices


def test_run_agents_api_flow(client: TestClient) -> None:
    """Test end-to-end API execution of multi-agent review."""
    # 1. Create project
    create_payload = {
        "name": "Food Delivery Enterprise",
        "requirement": "Build a food delivery platform supporting 50,000 concurrent users."
    }
    create_res = client.post("/api/projects", json=create_payload)
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # 2. Check agent results before running -> should be 'not_run'
    before_res = client.get(f"/api/projects/{project_id}/agent-results")
    assert before_res.status_code == 200
    assert before_res.json()["status"] == "not_run"
    assert before_res.json()["architecture"] is None

    # 3. Attempt running agents before analyzing requirement -> should return 422
    premature_run = client.post(f"/api/projects/{project_id}/run-agents")
    assert premature_run.status_code == 422
    assert "No requirement analysis found" in premature_run.json()["detail"]

    # 4. Run requirement analysis
    analyze_res = client.post(f"/api/projects/{project_id}/analyze-requirement")
    assert analyze_res.status_code == 200
    req_analysis_id = analyze_res.json()["analysis_id"]

    # 5. Run multi-agent review
    run_res = client.post(f"/api/projects/{project_id}/run-agents")
    assert run_res.status_code == 200
    data = run_res.json()
    assert data["project_id"] == project_id
    assert data["status"] == "ready"
    assert data["architecture"]["agent_type"] == "architecture"
    assert data["security"]["agent_type"] == "security"
    assert data["performance"]["agent_type"] == "performance"

    # 6. Retrieve agent results via GET
    get_res = client.get(f"/api/projects/{project_id}/agent-results")
    assert get_res.status_code == 200
    fetched_data = get_res.json()
    assert fetched_data["status"] == "ready"
    assert fetched_data["architecture"] is not None
    assert fetched_data["security"] is not None
    assert fetched_data["performance"] is not None


def test_run_agents_nonexistent_project_404(client: TestClient) -> None:
    """Test 404 response when attempting to run agents on non-existent project."""
    fake_id = str(uuid.uuid4())
    res = client.post(f"/api/projects/{fake_id}/run-agents")
    assert res.status_code == 404
    assert f"Project with ID '{fake_id}' not found." in res.json()["detail"]
