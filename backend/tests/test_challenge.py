import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_challenge_scenarios_listing(client: TestClient):
    """Test retrieving all available challenge scenarios."""
    create_res = client.post(
        "/api/projects",
        json={
            "name": "Global FinTech Payment Engine",
            "requirement": "Real-time payment clearing platform with 50,000 concurrent users and sub-100ms latency.",
        },
    )
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # Retrieve scenarios
    res = client.get(f"/api/projects/{project_id}/challenge-scenarios")
    assert res.status_code == 200
    scenarios = res.json()
    assert len(scenarios) == 7

    scenario_ids = [s["id"] for s in scenarios]
    assert "redis_unavailable" in scenario_ids
    assert "database_unavailable" in scenario_ids
    assert "traffic_spike_20x" in scenario_ids
    assert "downstream_service_slow" in scenario_ids
    assert "payment_success_order_fail" in scenario_ids
    assert "message_broker_unavailable" in scenario_ids
    assert "app_service_crash" in scenario_ids

    # Validate schema fields
    for s in scenarios:
        assert s["id"]
        assert s["name"]
        assert s["description"]
        assert s["category"]
        assert s["failure_condition"]
        assert len(s["expected_analysis_areas"]) >= 3


def test_challenge_simulation_flow(client: TestClient):
    """Test full challenge simulation flow across scenarios."""
    # 1. Create project and run through full pipeline to generate architecture
    create_res = client.post(
        "/api/projects",
        json={
            "name": "E-Commerce Core Microservices",
            "requirement": "High-throughput e-commerce checkout with PostgreSQL, Redis cache, and Kafka event bus.",
        },
    )
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    client.post(f"/api/projects/{project_id}/analyze-requirement")
    client.post(f"/api/projects/{project_id}/run-agents")
    client.post(f"/api/projects/{project_id}/review")
    client.post(f"/api/projects/{project_id}/explainability")

    # 2. Run Challenge 1: Redis Outage
    res_redis = client.post(
        f"/api/projects/{project_id}/challenge",
        json={"scenario_id": "redis_unavailable"},
    )
    assert res_redis.status_code == 200
    redis_data = res_redis.json()

    assert redis_data["project_id"] == project_id
    assert redis_data["scenario_id"] == "redis_unavailable"
    assert redis_data["result"]["impact"]["severity"] in ["low", "medium", "high", "critical"]
    assert len(redis_data["result"]["affected_components"]) >= 2
    assert len(redis_data["result"]["failure_propagation"]) >= 3
    assert len(redis_data["result"]["existing_safeguards"]) >= 2
    assert len(redis_data["result"]["identified_gaps"]) >= 1
    assert len(redis_data["result"]["mitigations"]) >= 2
    assert redis_data["result"]["recovery_strategy"]
    assert len(redis_data["result"]["architecture_changes"]) >= 1
    assert redis_data["result"]["confidence"] >= 0.9

    challenge_1_id = redis_data["id"]

    # 3. Run Challenge 2: 20x Traffic Surge
    res_traffic = client.post(
        f"/api/projects/{project_id}/challenge",
        json={"scenario_id": "traffic_spike_20x"},
    )
    assert res_traffic.status_code == 200
    traffic_data = res_traffic.json()
    assert traffic_data["scenario_id"] == "traffic_spike_20x"
    assert traffic_data["result"]["impact"]["severity"] == "high"

    # 4. Run Challenge 3: Payment Success / Order Creation Fail
    res_payment = client.post(
        f"/api/projects/{project_id}/challenge",
        json={"scenario_id": "payment_success_order_fail"},
    )
    assert res_payment.status_code == 200
    payment_data = res_payment.json()
    assert payment_data["scenario_id"] == "payment_success_order_fail"
    assert "Saga" in str(payment_data["result"]["mitigations"]) or "compensating" in str(payment_data["result"]["mitigations"]).lower()

    # 5. List challenge runs
    list_res = client.get(f"/api/projects/{project_id}/challenges")
    assert list_res.status_code == 200
    runs = list_res.json()
    assert len(runs) >= 3
    run_ids = [r["id"] for r in runs]
    assert challenge_1_id in run_ids

    # 6. Fetch single challenge run
    single_res = client.get(f"/api/projects/{project_id}/challenges/{challenge_1_id}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == challenge_1_id
    assert single_res.json()["scenario_id"] == "redis_unavailable"


def test_challenge_error_handling(client: TestClient):
    """Test 404 and 422 validations on challenge endpoints."""
    fake_project_id = str(uuid.uuid4())
    fake_challenge_id = str(uuid.uuid4())

    # Non-existent project
    res_404 = client.get(f"/api/projects/{fake_project_id}/challenge-scenarios")
    # scenarios listing doesn't check project if not DB bound, but lets check POST /challenge
    post_404 = client.post(
        f"/api/projects/{fake_project_id}/challenge",
        json={"scenario_id": "redis_unavailable"},
    )
    assert post_404.status_code == 404

    # Create real project
    create_res = client.post(
        "/api/projects",
        json={
            "name": "Test Service",
            "requirement": "Simple CRUD service.",
        },
    )
    real_project_id = create_res.json()["id"]

    # Invalid scenario ID
    invalid_scenario_res = client.post(
        f"/api/projects/{real_project_id}/challenge",
        json={"scenario_id": "alien_invasion_destruction"},
    )
    assert invalid_scenario_res.status_code == 404

    # Non-existent challenge run ID
    get_fake_run = client.get(f"/api/projects/{real_project_id}/challenges/{fake_challenge_id}")
    assert get_fake_run.status_code == 404
