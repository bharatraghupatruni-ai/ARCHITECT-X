import uuid
from fastapi.testclient import TestClient


def test_create_project_success(client: TestClient) -> None:
    """Test creating a project with valid inputs."""
    payload = {
        "name": "Food Delivery Platform",
        "requirement": "Build a food delivery platform supporting 50,000 concurrent users."
    }
    response = client.post("/api/projects", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["name"] == "Food Delivery Platform"
    assert data["requirement"] == "Build a food delivery platform supporting 50,000 concurrent users."
    assert data["status"] == "created"
    assert "created_at" in data
    assert "updated_at" in data


def test_get_project_by_id(client: TestClient) -> None:
    """Test retrieving a single project by UUID."""
    create_payload = {
        "name": "E-Commerce Microservices",
        "requirement": "High throughput e-commerce checkout architecture with event sourcing."
    }
    create_res = client.post("/api/projects", json=create_payload)
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    get_res = client.get(f"/api/projects/{project_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == project_id
    assert data["name"] == "E-Commerce Microservices"
    assert data["status"] == "created"


def test_get_nonexistent_project_404(client: TestClient) -> None:
    """Test 404 response for non-existent project UUID."""
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/projects/{fake_id}")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert f"Project with ID '{fake_id}' not found." in data["detail"]


def test_list_projects(client: TestClient) -> None:
    """Test listing all projects."""
    p1 = {"name": "Project A", "requirement": "Requirement for system A."}
    p2 = {"name": "Project B", "requirement": "Requirement for system B."}
    client.post("/api/projects", json=p1)
    client.post("/api/projects", json=p2)

    response = client.get("/api/projects")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    names = [p["name"] for p in data]
    assert "Project A" in names
    assert "Project B" in names


def test_create_project_empty_requirement_validation(client: TestClient) -> None:
    """Test validation fails when requirement is empty string."""
    payload = {
        "name": "Invalid Project",
        "requirement": ""
    }
    response = client.post("/api/projects", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert "Requirement cannot be empty" in data["detail"] or "requirement" in data["detail"].lower()


def test_create_project_whitespace_requirement_validation(client: TestClient) -> None:
    """Test validation fails when requirement contains only whitespace."""
    payload = {
        "name": "Invalid Project",
        "requirement": "      "
    }
    response = client.post("/api/projects", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_create_project_empty_name_validation(client: TestClient) -> None:
    """Test validation fails when name is empty."""
    payload = {
        "name": "   ",
        "requirement": "Valid requirement description here."
    }
    response = client.post("/api/projects", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_analyze_project_requirement_api(client: TestClient) -> None:
    """Test POST /api/projects/{id}/analyze-requirement endpoint."""
    # 1. Create project
    create_payload = {
        "name": "Food Delivery Service",
        "requirement": "Build a food delivery platform supporting 50,000 concurrent users."
    }
    create_res = client.post("/api/projects", json=create_payload)
    assert create_res.status_code == 201
    project_id = create_res.json()["id"]

    # 2. Analyze requirement
    analyze_res = client.post(f"/api/projects/{project_id}/analyze-requirement")
    assert analyze_res.status_code == 200
    data = analyze_res.json()
    assert data["project_id"] == project_id
    assert data["version"] == 1
    assert "analysis_id" in data

    analysis = data["analysis"]
    assert analysis["domain"] == "food_delivery"
    assert analysis["scale"]["expected_concurrent_users"] == 50000
    assert len(analysis["functional_requirements"]) > 0
    assert len(analysis["non_functional_requirements"]) > 0

    # 3. Verify project status updated to completed
    get_proj = client.get(f"/api/projects/{project_id}")
    assert get_proj.json()["status"] == "completed"

    # 4. Trigger second analysis and verify version increments to 2
    analyze_res_2 = client.post(f"/api/projects/{project_id}/analyze-requirement")
    assert analyze_res_2.status_code == 200
    assert analyze_res_2.json()["version"] == 2

    # 5. Verify list analyses returns both versions
    list_analyses_res = client.get(f"/api/projects/{project_id}/analyses")
    assert list_analyses_res.status_code == 200
    analyses = list_analyses_res.json()
    assert len(analyses) == 2
    assert analyses[0]["version"] == 2
    assert analyses[1]["version"] == 1

    # 6. Verify latest analysis
    latest_res = client.get(f"/api/projects/{project_id}/latest-analysis")
    assert latest_res.status_code == 200
    assert latest_res.json()["version"] == 2


def test_analyze_nonexistent_project_404(client: TestClient) -> None:
    """Test analyze requirement returns 404 for non-existent project ID."""
    fake_id = str(uuid.uuid4())
    res = client.post(f"/api/projects/{fake_id}/analyze-requirement")
    assert res.status_code == 404
    assert f"Project with ID '{fake_id}' not found." in res.json()["detail"]
