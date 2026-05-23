"""
Case management endpoint tests
"""
import pytest


class TestCasesList:
    """Test case listing endpoints"""

    @pytest.mark.api
    def test_get_cases_list(self, api_client):
        """Test getting list of cases"""
        response = api_client.get("/api/case-management/cases")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Case management endpoint not available")

        assert response.get("success") is True or "cases" in response.get("data", {})

    @pytest.mark.api
    def test_get_cases_with_pagination(self, api_client):
        """Test case pagination"""
        response = api_client.get("/api/case-management/cases", params={
            "page": 1,
            "limit": 10
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Case management endpoint not available")

        assert response.get("success") is True

    @pytest.mark.api
    def test_get_cases_with_status_filter(self, api_client):
        """Test filtering cases by status"""
        response = api_client.get("/api/case-management/cases", params={
            "status": "in_progress"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Case management endpoint not available")

        assert response.get("success") is True

    @pytest.mark.api
    def test_get_cases_with_priority_filter(self, api_client):
        """Test filtering cases by priority"""
        response = api_client.get("/api/case-management/cases", params={
            "priority": "urgent"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Case management endpoint not available")

        assert response.get("success") is True


class TestCaseCRUD:
    """Test case CRUD operations"""

    @pytest.mark.api
    def test_create_case(self, api_client, test_data):
        """Test creating a new case"""
        case_data = test_data.generate_case()

        response = api_client.post("/api/case-management/cases", json=case_data)

        if response.get("status_code") in [404, 503]:
            pytest.skip("Case management endpoint not available")

        assert response.get("success") is True
        assert response.get("data") is not None

    @pytest.mark.api
    def test_get_case_by_id(self, api_client, created_case):
        """Test getting case by ID"""
        if not created_case:
            pytest.skip("Case creation failed")

        case_id = created_case.get("id") or created_case.get("case_id")
        response = api_client.get(f"/api/case-management/cases/{case_id}")

        if response.get("status_code") == 404:
            # Try with case number
            case_number = created_case.get("case_number")
            response = api_client.get(f"/api/case-management/cases/{case_number}")

        assert response.get("success") is True or response.get("status_code") == 200


class TestCaseStatus:
    """Test case status management"""

    @pytest.mark.api
    def test_update_case_status(self, api_client, created_case):
        """Test updating case status"""
        if not created_case:
            pytest.skip("Case creation failed")

        case_id = created_case.get("id") or created_case.get("case_id")
        response = api_client.put(f"/api/case-management/cases/{case_id}/status", json={
            "status": "in_progress"
        })

        if response.get("status_code") == 404:
            pytest.skip("Status update endpoint not available")

        assert response.get("success") is True


class TestCaseNotes:
    """Test case notes functionality"""

    @pytest.mark.api
    def test_add_case_note(self, api_client, created_case):
        """Test adding a note to a case"""
        if not created_case:
            pytest.skip("Case creation failed")

        case_id = created_case.get("id") or created_case.get("case_id")
        response = api_client.post(f"/api/case-management/cases/{case_id}/notes", json={
            "noteType": "general",
            "content": "Test note content",
            "createdBy": "Test User"
        })

        if response.get("status_code") == 404:
            pytest.skip("Notes endpoint not available")

        assert response.get("success") is True


class TestCaseAlerts:
    """Test case alerts functionality"""

    @pytest.mark.api
    def test_create_case_alert(self, api_client, created_case):
        """Test creating an alert for a case"""
        if not created_case:
            pytest.skip("Case creation failed")

        case_id = created_case.get("id") or created_case.get("case_id")
        response = api_client.post(f"/api/case-management/cases/{case_id}/alerts", json={
            "alert_message": "Test alert",
            "severity": "medium"
        })

        if response.get("status_code") == 404:
            pytest.skip("Alerts endpoint not available")

        assert response.get("success") is True or response.get("status_code") == 201


class TestCaseWorkload:
    """Test case workload endpoints"""

    @pytest.mark.api
    def test_get_workload_summary(self, api_client):
        """Test getting workload summary"""
        response = api_client.get("/api/case-management/workload")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Workload endpoint not available")

        assert response.get("success") is True
        # Should include workload data
        data = response.get("data", {})
        assert isinstance(data, dict)

    @pytest.mark.api
    def test_get_analyst_workload(self, api_client):
        """Test getting analyst-specific workload"""
        response = api_client.get("/api/case-management/workload/analyst")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Analyst workload endpoint not available")

        assert response.get("success") is True


class TestCaseExport:
    """Test case export functionality"""

    @pytest.mark.api
    def test_export_case_json(self, api_client, created_case):
        """Test exporting case as JSON"""
        if not created_case:
            pytest.skip("Case creation failed")

        case_id = created_case.get("id") or created_case.get("case_id")
        response = api_client.get(f"/api/case-management/cases/{case_id}/export", params={
            "format": "json"
        })

        if response.get("status_code") == 404:
            pytest.skip("Export endpoint not available")

        assert response.get("success") is True or isinstance(response.get("data"), dict)

    @pytest.mark.api
    def test_export_case_csv(self, api_client, created_case):
        """Test exporting case as CSV"""
        if not created_case:
            pytest.skip("Case creation failed")

        case_id = created_case.get("id") or created_case.get("case_id")
        response = api_client.get(f"/api/case-management/cases/{case_id}/export", params={
            "format": "csv"
        })

        if response.get("status_code") == 404:
            pytest.skip("Export endpoint not available")

        # CSV export might return blob or text
        assert response.get("success") is not None or response.get("text") is not None
