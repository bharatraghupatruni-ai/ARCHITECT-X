"""Tests for the enhanced health check endpoint."""
from fastapi.testclient import TestClient


def test_health_check_status_ok(client: TestClient) -> None:
    """Test GET /api/health returns 200 and status field."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    # Accept "ok" or "degraded" — depends on whether DB is reachable in test env
    assert data["status"] in ("ok", "degraded")
    assert data["service"] == "architect-x"


def test_health_check_has_version(client: TestClient) -> None:
    """Health check should include version field."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert data["version"] is not None


def test_health_check_has_environment(client: TestClient) -> None:
    """Health check should include environment field."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "environment" in data


def test_health_check_has_checks_dict(client: TestClient) -> None:
    """Health check should return a checks dict with api, database, and vector_store keys."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "checks" in data
    checks = data["checks"]
    assert "api" in checks
    assert "database" in checks
    assert "vector_store" in checks
    assert checks["api"]["status"] == "ok"


def test_root_endpoint(client: TestClient) -> None:
    """Test root GET / returns basic online info including environment."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["service"] == "ARCHITECT-X"
    assert "environment" in data
    assert "version" in data
