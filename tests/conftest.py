"""
Global pytest configuration and fixtures for JAG-LABSCIENTIFIC-DNA TestOps
"""
import pytest
import os
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from tests.utils.api_client import APIClient
from tests.utils.test_data import TestDataGenerator


# Configuration
BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:3001")


@pytest.fixture(scope="session")
def api_client():
    """Create API client for the test session"""
    client = APIClient(BASE_URL)
    yield client


@pytest.fixture(scope="session")
def authenticated_client(api_client):
    """Create authenticated API client"""
    # Try to login with test credentials
    try:
        api_client.login("admin", "admin123")
    except Exception:
        # If login fails, continue without auth (some endpoints don't require it)
        pass
    yield api_client


@pytest.fixture(scope="function")
def test_data():
    """Generate test data for each test"""
    return TestDataGenerator()


@pytest.fixture(scope="session")
def fsa_files_path():
    """Path to FSA test files"""
    path = PROJECT_ROOT / "backend" / "osiris_workspace" / "input"
    return path


@pytest.fixture(scope="session")
def sample_fsa_file(fsa_files_path):
    """Get a sample FSA file for testing"""
    fsa_files = list(fsa_files_path.glob("*.fsa"))
    if fsa_files:
        return fsa_files[0]
    return None


@pytest.fixture(scope="function")
def created_sample(authenticated_client, test_data):
    """Create a sample and clean up after test"""
    sample_data = test_data.generate_sample()
    response = authenticated_client.post("/api/samples", json=sample_data)

    if response.get("success") and response.get("data"):
        sample = response["data"]
        yield sample
        # Cleanup: try to delete the sample (if endpoint exists)
        try:
            authenticated_client.delete(f"/api/samples/{sample['id']}")
        except Exception:
            pass
    else:
        yield None


@pytest.fixture(scope="function")
def created_case(authenticated_client, test_data):
    """Create a case and clean up after test"""
    case_data = test_data.generate_case()
    response = authenticated_client.post("/api/case-management/cases", json=case_data)

    if response.get("success") and response.get("data"):
        case = response["data"]
        yield case
    else:
        yield None


# Pytest hooks for better reporting
def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line("markers", "api: API endpoint tests")
    config.addinivalue_line("markers", "genemapper: GeneMapper/FSA tests")
    config.addinivalue_line("markers", "integration: Integration tests")


def pytest_collection_modifyitems(config, items):
    """Add markers based on test location"""
    for item in items:
        if "api" in str(item.fspath):
            item.add_marker(pytest.mark.api)
        elif "genemapper" in str(item.fspath):
            item.add_marker(pytest.mark.genemapper)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)


def pytest_html_report_title(report):
    """Set HTML report title"""
    report.title = "JAG-LABSCIENTIFIC-DNA TestOps Report"
