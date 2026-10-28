import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Multimodal RAG Studio" in data["service"]

def test_settings_status(client):
    response = client.get("/api/settings/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "pdf" in data["allowed_extensions"]
    assert data["pymupdf_available"] is True

def test_dashboard_stats(client):
    response = client.get("/api/documents/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "total_documents" in data
    assert "completed_documents" in data
    assert "recent_documents" in data
