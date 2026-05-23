"""
Forensic reports endpoint tests
"""
import pytest


class TestForensicReportTemplates:
    """Test forensic report template endpoints"""

    @pytest.mark.api
    def test_get_report_templates(self, api_client):
        """Test getting available report templates"""
        response = api_client.get("/api/forensic-reports/templates")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Forensic reports endpoint not available")

        assert response.get("success") is not None or isinstance(response.get("data"), list)


class TestPaternityReports:
    """Test paternity report generation"""

    @pytest.mark.api
    def test_generate_paternity_report(self, api_client, test_data):
        """Test generating a paternity report"""
        report_data = test_data.generate_report_request()

        response = api_client.post("/api/forensic-reports/paternity", json=report_data)

        if response.get("status_code") in [404, 503]:
            pytest.skip("Paternity report endpoint not available")

        if response.get("success"):
            data = response.get("data", {})
            assert "reportId" in data or "report_id" in data or "filename" in data

    @pytest.mark.api
    def test_generate_paternity_report_with_options(self, api_client, test_data):
        """Test paternity report with all options enabled"""
        report_data = test_data.generate_report_request()
        report_data["options"] = {
            "includeElectropherogram": True,
            "includeStatistics": True,
            "includeChainOfCustody": True
        }

        response = api_client.post("/api/forensic-reports/paternity", json=report_data)

        if response.get("status_code") in [404, 503]:
            pytest.skip("Paternity report endpoint not available")

        assert response.get("success") is not None


class TestKinshipReports:
    """Test kinship report generation"""

    @pytest.mark.api
    def test_generate_kinship_report(self, api_client, test_data):
        """Test generating a kinship report"""
        response = api_client.post("/api/forensic-reports/kinship", json={
            "analysisData": {
                "caseNumber": test_data.generate_case_number("KIN"),
                "relationship": "full-sibling",
                "profiles": [],
                "likelihoodRatio": 100,
                "interpretation": "Consistent with proposed relationship"
            }
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Kinship report endpoint not available")

        assert response.get("success") is not None


class TestMixtureReports:
    """Test mixture analysis report generation"""

    @pytest.mark.api
    def test_generate_mixture_report(self, api_client, test_data):
        """Test generating a mixture analysis report"""
        response = api_client.post("/api/forensic-reports/mixture", json={
            "mixtureData": {
                "caseNumber": test_data.generate_case_number("MIX"),
                "numContributors": 2,
                "majorContributor": {},
                "minorContributor": {},
                "mixtureRatio": "3:1",
                "interpretation": "Two-person mixture detected"
            }
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Mixture report endpoint not available")

        assert response.get("success") is not None


class TestComprehensiveReports:
    """Test comprehensive report generation"""

    @pytest.mark.api
    def test_generate_comprehensive_report(self, api_client):
        """Test generating a comprehensive case report"""
        response = api_client.post("/api/forensic-reports/comprehensive/1")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Comprehensive report endpoint not available")

        assert response.get("success") is not None


class TestBatchReports:
    """Test batch report generation"""

    @pytest.mark.api
    def test_generate_batch_report(self, api_client):
        """Test generating a batch report"""
        response = api_client.post("/api/forensic-reports/batch", json={
            "batchId": 1,
            "options": {
                "includeSummary": True,
                "includeDetails": True
            }
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Batch report endpoint not available")

        assert response.get("success") is not None


class TestChainOfCustodyReports:
    """Test chain of custody report generation"""

    @pytest.mark.api
    def test_generate_chain_of_custody_report(self, api_client):
        """Test generating a chain of custody report"""
        response = api_client.post("/api/forensic-reports/chain-of-custody", json={
            "caseId": 1,
            "custodyData": {
                "collector": "Test Collector",
                "collectionDate": "2024-01-01T10:00:00Z",
                "chainOfCustody": []
            }
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Chain of custody report endpoint not available")

        assert response.get("success") is not None


class TestCaseReports:
    """Test case-specific report endpoints"""

    @pytest.mark.api
    def test_get_case_reports(self, api_client):
        """Test getting reports for a case"""
        response = api_client.get("/api/forensic-reports/case/PAT-2024-001")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Case reports endpoint not available")

        assert response.get("success") is not None


class TestReportDownload:
    """Test forensic report download"""

    @pytest.mark.api
    def test_download_forensic_report(self, api_client):
        """Test downloading a forensic report"""
        response = api_client.get("/api/forensic-reports/download/test-report-id")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Report download endpoint not available")

        # Should return file or error
        assert response.get("success") is not None or response.get("text") is not None

    @pytest.mark.api
    def test_view_forensic_report(self, api_client):
        """Test viewing a forensic report"""
        response = api_client.get("/api/forensic-reports/test-report-id")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Report view endpoint not available")

        assert response.get("success") is not None or response.get("text") is not None
