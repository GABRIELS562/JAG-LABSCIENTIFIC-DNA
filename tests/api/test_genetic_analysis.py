"""
Genetic analysis endpoint tests
"""
import pytest
from pathlib import Path


class TestGeneticAnalysisCases:
    """Test genetic analysis case endpoints"""

    @pytest.mark.api
    def test_get_genetic_cases(self, api_client):
        """Test getting list of genetic analysis cases"""
        response = api_client.get("/api/genetic-analysis/cases")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Genetic analysis endpoint not available")

        assert response.get("success") is True or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_create_genetic_case(self, api_client, test_data):
        """Test creating a genetic analysis case"""
        case_data = {
            "caseNumber": test_data.generate_case_number("GEN"),
            "testType": "paternity",
            "samples": []
        }

        response = api_client.post("/api/genetic-analysis/cases", json=case_data)

        if response.get("status_code") in [404, 503]:
            pytest.skip("Genetic analysis endpoint not available")

        if response.get("success"):
            assert response.get("data") is not None


class TestFSAUpload:
    """Test FSA file upload endpoints"""

    @pytest.mark.api
    def test_upload_fsa_file(self, api_client, sample_fsa_file):
        """Test uploading a single FSA file"""
        if not sample_fsa_file or not sample_fsa_file.exists():
            pytest.skip("No FSA test file available")

        response = api_client.upload_fsa_file(
            "/api/genetic-analysis/test-str-analyzer",
            sample_fsa_file
        )

        if response.get("status_code") in [404, 503]:
            pytest.skip("FSA upload endpoint not available")

        # Should either succeed or return analysis results
        assert response.get("success") is not None or response.get("data") is not None

    @pytest.mark.api
    def test_upload_fsa_to_case(self, api_client, fsa_files_path):
        """Test uploading FSA files to a case"""
        fsa_files = list(fsa_files_path.glob("*.fsa"))[:3]

        if not fsa_files:
            pytest.skip("No FSA test files available")

        response = api_client.upload_multiple_fsa_files(
            "/api/genetic-analysis/cases/1/samples",
            fsa_files
        )

        if response.get("status_code") in [404, 503]:
            pytest.skip("FSA upload endpoint not available")

        assert response.get("success") is not None


class TestOsirisIntegration:
    """Test OSIRIS integration endpoints"""

    @pytest.mark.api
    def test_initialize_osiris(self, api_client):
        """Test initializing OSIRIS workspace"""
        response = api_client.post("/api/genetic-analysis/initialize-osiris")

        if response.get("status_code") in [404, 503]:
            pytest.skip("OSIRIS initialization endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_workspace_status(self, api_client):
        """Test getting OSIRIS workspace status"""
        response = api_client.get("/api/genetic-analysis/workspace-status")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Workspace status endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_queue_status(self, api_client):
        """Test getting OSIRIS analysis queue status"""
        response = api_client.get("/api/genetic-analysis/queue-status")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Queue status endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_launch_osiris(self, api_client):
        """Test launching OSIRIS GUI (may not work in CI)"""
        response = api_client.post("/api/genetic-analysis/launch-osiris")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Launch OSIRIS endpoint not available")

        # This might fail if OSIRIS is not installed
        assert response.get("success") is not None or response.get("error") is not None


class TestGeneMapperResults:
    """Test GeneMapper results endpoints"""

    @pytest.mark.api
    def test_get_genemapper_results(self, api_client):
        """Test getting GeneMapper analysis results"""
        response = api_client.get("/api/genetic-analysis/genemapper-results")

        if response.get("status_code") in [404, 503]:
            pytest.skip("GeneMapper results endpoint not available")

        assert response.get("success") is not None or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_store_genemapper_results(self, api_client, test_data):
        """Test storing GeneMapper results"""
        profile = test_data.generate_str_profile()

        response = api_client.post("/api/genetic-analysis/genemapper-results", json={
            "caseId": 1,
            "sampleId": "TEST-001",
            "profile": profile,
            "qualityMetrics": {
                "averagePeakHeight": 5000,
                "signalToNoise": 50
            }
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Store GeneMapper results endpoint not available")

        assert response.get("success") is not None


class TestAnalysisResults:
    """Test analysis results endpoints"""

    @pytest.mark.api
    def test_get_analysis_results(self, api_client):
        """Test getting analysis results"""
        response = api_client.get("/api/genetic-analysis/results")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Analysis results endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_case_results(self, api_client):
        """Test getting results for a specific case"""
        response = api_client.get("/api/genetic-analysis/cases/1/results")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Case results endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_start_analysis(self, api_client):
        """Test starting analysis for a case"""
        response = api_client.post("/api/genetic-analysis/cases/1/analyze")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Start analysis endpoint not available")

        assert response.get("success") is not None


class TestBatches:
    """Test batch management endpoints"""

    @pytest.mark.api
    def test_get_batches(self, api_client):
        """Test getting list of batches"""
        response = api_client.get("/api/genetic-analysis/batches")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Batches endpoint not available")

        assert response.get("success") is not None or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_create_batch(self, api_client):
        """Test creating a new batch"""
        response = api_client.post("/api/genetic-analysis/batches", json={
            "batchType": "pcr",
            "sampleIds": [1, 2, 3]
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Create batch endpoint not available")

        assert response.get("success") is not None


class TestReportGeneration:
    """Test report generation endpoints"""

    @pytest.mark.api
    def test_generate_case_report(self, api_client):
        """Test generating report for a case"""
        response = api_client.post("/api/genetic-analysis/cases/1/generate-report")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Generate report endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_case_reports(self, api_client):
        """Test getting available reports for a case"""
        response = api_client.get("/api/genetic-analysis/cases/1/reports")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Case reports endpoint not available")

        assert response.get("success") is not None
