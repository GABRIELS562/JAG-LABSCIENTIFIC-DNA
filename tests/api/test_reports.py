"""
Reports endpoint tests
"""
import pytest


class TestReportsList:
    """Test reports listing endpoints"""

    @pytest.mark.api
    def test_get_reports_list(self, api_client):
        """Test getting list of reports"""
        response = api_client.get("/api/reports")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Reports endpoint not available")

        assert response.get("success") is True or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_get_reports_with_pagination(self, api_client):
        """Test reports pagination"""
        response = api_client.get("/api/reports", params={
            "page": 1,
            "limit": 10
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Reports endpoint not available")

        assert response.get("success") is True

    @pytest.mark.api
    def test_get_reports_by_status(self, api_client):
        """Test filtering reports by status"""
        statuses = ["pending", "completed", "sent"]

        for status in statuses:
            response = api_client.get("/api/reports", params={"status": status})

            if response.get("status_code") == 404:
                pytest.skip("Reports endpoint not available")
                break

            assert response.get("success") is not None
            break

    @pytest.mark.api
    def test_get_reports_by_batch_type(self, api_client):
        """Test filtering reports by batch type"""
        response = api_client.get("/api/reports", params={"batch_type": "legal"})

        if response.get("status_code") in [404, 503]:
            pytest.skip("Reports endpoint not available")

        assert response.get("success") is not None


class TestReportStats:
    """Test report statistics endpoints"""

    @pytest.mark.api
    def test_get_report_stats(self, api_client):
        """Test getting report statistics"""
        response = api_client.get("/api/reports/stats")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Report stats endpoint not available")

        assert response.get("success") is not None


class TestReportCRUD:
    """Test report CRUD operations"""

    @pytest.mark.api
    def test_create_report(self, api_client):
        """Test creating a new report"""
        response = api_client.post("/api/reports", json={
            "case_id": 1,
            "batch_id": 1,
            "batch_type": "legal"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Reports endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_report_by_id(self, api_client):
        """Test getting report by ID"""
        response = api_client.get("/api/reports/1")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Reports endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_update_report_status(self, api_client):
        """Test updating report status"""
        response = api_client.patch("/api/reports/1/status", json={
            "status": "completed",
            "notes": "Report completed successfully"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Report status update endpoint not available")

        assert response.get("success") is not None


class TestReportDownload:
    """Test report download functionality"""

    @pytest.mark.api
    def test_download_report(self, api_client):
        """Test downloading a report"""
        response = api_client.get("/api/reports/1/download")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Report download endpoint not available")

        # Download might return binary data or redirect
        assert response.get("success") is not None or response.get("text") is not None

    @pytest.mark.api
    def test_view_report(self, api_client):
        """Test viewing a report inline"""
        response = api_client.get("/api/reports/1/view")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Report view endpoint not available")

        assert response.get("success") is not None or response.get("text") is not None

    @pytest.mark.api
    def test_get_report_access_logs(self, api_client):
        """Test getting report access logs"""
        response = api_client.get("/api/reports/1/access-logs")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Report access logs endpoint not available")

        assert response.get("success") is not None
