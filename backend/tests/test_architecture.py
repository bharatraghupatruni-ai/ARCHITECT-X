import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_unified_architecture_api_flow(client: TestClient):
    # 1. Create project
    create_res = client.post(
        "/api/projects",
        json={
            "name": "Ultra-Low Latency Order Matching Engine",
            "requirement": "Build a financial order matching engine supporting 100,000 concurrent traders with sub-millisecond execution and zero-trust auth.",
        },
    )
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # 2. Analyze requirement
    analyze_res = client.post(f"/api/projects/{project_id}/analyze-requirement")
    assert analyze_res.status_code == 200

    # 3. Run agents
    agent_res = client.post(f"/api/projects/{project_id}/run-agents")
    assert agent_res.status_code == 200

    # 4. Run review & conflict engine
    review_res = client.post(f"/api/projects/{project_id}/review")
    assert review_res.status_code == 200

    # 5. Generate explainability (ADRs + C4)
    exp_res = client.post(f"/api/projects/{project_id}/explainability")
    assert exp_res.status_code == 200

    # 6. Fetch unified architecture
    arch_res = client.get(f"/api/projects/{project_id}/architecture")
    assert arch_res.status_code == 200
    arch_data = arch_res.json()

    # Verify root fields
    assert arch_data["project"]["id"] == project_id
    assert arch_data["overview"]["total_components"] >= 5
    assert arch_data["overview"]["total_connections"] >= 5
    assert arch_data["overview"]["total_security_zones"] >= 3
    assert arch_data["overview"]["total_traceability_links"] >= 1

    # Verify components
    components = arch_data["components"]
    component_categories = [c["category"] for c in components]
    assert "ui" in component_categories
    assert "gateway" in component_categories
    assert "service" in component_categories
    assert "database" in component_categories
    assert "cache" in component_categories
    assert "queue" in component_categories

    # Verify connections
    connections = arch_data["connections"]
    protocols = [conn["protocol"] for conn in connections]
    assert any("HTTPS" in p or "gRPC" in p or "RESP" in p or "SQL" in p or "Kafka" in p for p in protocols)

    # Verify security boundaries
    boundaries = arch_data["security_boundaries"]
    zones = [b["zone"] for b in boundaries]
    assert "public" in zones
    assert "dmz" in zones
    assert "vpc_private" in zones
    assert "secure_persistence" in zones

    # Verify technologies
    technologies = arch_data["technologies"]
    assert len(technologies) >= 4

    # Verify scaling
    scaling = arch_data["scaling"]
    assert scaling["expected_concurrency"] is not None
    assert "caching_strategy" in scaling

    # Verify decisions and risks
    assert len(arch_data["decisions"]) >= 1
    assert len(arch_data["risks"]) >= 1

    # Verify traceability
    traceability = arch_data["traceability"]
    assert len(traceability) >= 1
    trace_1 = traceability[0]
    assert trace_1["requirement_id"] != ""
    assert trace_1["requirement_text"] != ""
    assert trace_1["agent_recommendation"] is not None
    assert len(trace_1["target_components"]) >= 1

    # Verify mermaid diagram string
    assert "C4Container" in arch_data["mermaid_diagram"] or "Container" in arch_data["mermaid_diagram"]


def test_traceability_matrix_lineage(client: TestClient):
    create_res = client.post(
        "/api/projects",
        json={
            "name": "Real-Time Telemetry System",
            "requirement": "Build a real-time IoT vehicle telemetry system processing 50,000 events/sec with PostgreSQL persistence.",
        },
    )
    project_id = create_res.json()["id"]

    # Analyze & review
    client.post(f"/api/projects/{project_id}/analyze-requirement")
    client.post(f"/api/projects/{project_id}/run-agents")
    client.post(f"/api/projects/{project_id}/review")
    client.post(f"/api/projects/{project_id}/explainability")

    arch_res = client.get(f"/api/projects/{project_id}/architecture")
    assert arch_res.status_code == 200
    traceability = arch_res.json()["traceability"]

    # Verify full chain: Req -> Agent -> Conflict -> Decision -> Components
    for node in traceability:
        assert node["requirement_type"] in ["functional", "non_functional", "scale", "constraint"]
        assert node["agent_recommendation"] is not None
        assert node["conflict_or_tension"] is not None
        assert node["adjudicated_decision"] is not None
        assert len(node["target_components"]) > 0


def test_architecture_nonexistent_project_404(client: TestClient):
    fake_id = uuid.uuid4()
    res = client.get(f"/api/projects/{fake_id}/architecture")
    assert res.status_code == 404
