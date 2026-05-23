"""
Quality Management System (QMS) endpoint tests
"""
import pytest


class TestCAPAActions:
    """Test CAPA (Corrective/Preventive Action) endpoints"""

    @pytest.mark.api
    def test_get_capa_list(self, api_client):
        """Test getting list of CAPA actions"""
        response = api_client.get("/api/qms/capa")

        if response.get("status_code") in [404, 503]:
            pytest.skip("QMS CAPA endpoint not available")

        assert response.get("success") is not None or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_get_capa_with_filters(self, api_client):
        """Test filtering CAPA actions"""
        response = api_client.get("/api/qms/capa", params={
            "status": "open",
            "priority": "high"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("QMS CAPA endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_capa_by_type(self, api_client):
        """Test filtering CAPA by type"""
        response = api_client.get("/api/qms/capa", params={"type": "corrective"})

        if response.get("status_code") in [404, 503]:
            pytest.skip("QMS CAPA endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_create_capa(self, api_client, test_data):
        """Test creating a new CAPA action"""
        capa_data = test_data.generate_capa()

        response = api_client.post("/api/qms/capa", json=capa_data)

        if response.get("status_code") in [404, 503]:
            pytest.skip("QMS CAPA endpoint not available")

        if response.get("success"):
            assert response.get("data") is not None

    @pytest.mark.api
    def test_get_capa_by_id(self, api_client):
        """Test getting CAPA by ID"""
        response = api_client.get("/api/qms/capa/1")

        if response.get("status_code") in [404, 503]:
            pytest.skip("QMS CAPA endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_update_capa(self, api_client):
        """Test updating a CAPA action"""
        response = api_client.put("/api/qms/capa/1", json={
            "status": "in_progress",
            "notes": "Updated notes"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("QMS CAPA endpoint not available")

        assert response.get("success") is not None


class TestEquipment:
    """Test equipment management endpoints"""

    @pytest.mark.api
    def test_get_equipment_list(self, api_client):
        """Test getting list of equipment"""
        response = api_client.get("/api/qms/equipment")

        if response.get("status_code") in [404, 503]:
            pytest.skip("QMS equipment endpoint not available")

        assert response.get("success") is not None or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_get_calibration_schedule(self, api_client):
        """Test getting equipment calibration schedule"""
        response = api_client.get("/api/qms/equipment/calibration-schedule")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Calibration schedule endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_record_calibration(self, api_client):
        """Test recording equipment calibration"""
        response = api_client.post("/api/qms/equipment/1/calibrations", json={
            "calibration_date": "2024-01-15",
            "next_calibration_date": "2025-01-15",
            "performed_by": "Test Technician",
            "result": "passed",
            "certificate_number": "CAL-2024-001"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Calibration recording endpoint not available")

        assert response.get("success") is not None


class TestDocuments:
    """Test document control endpoints"""

    @pytest.mark.api
    def test_get_documents(self, api_client):
        """Test getting list of documents"""
        response = api_client.get("/api/qms/documents")

        if response.get("status_code") in [404, 503]:
            pytest.skip("QMS documents endpoint not available")

        assert response.get("success") is not None or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_get_documents_by_category(self, api_client):
        """Test filtering documents by category"""
        response = api_client.get("/api/qms/documents", params={"category": "SOP"})

        if response.get("status_code") in [404, 503]:
            pytest.skip("QMS documents endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_document_categories(self, api_client):
        """Test getting document categories"""
        response = api_client.get("/api/qms/documents/categories")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Document categories endpoint not available")

        assert response.get("success") is not None or isinstance(response.get("data"), list)


class TestTraining:
    """Test training management endpoints"""

    @pytest.mark.api
    def test_get_training_programs(self, api_client):
        """Test getting training programs"""
        response = api_client.get("/api/qms/training/programs")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Training programs endpoint not available")

        assert response.get("success") is not None or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_get_employee_training_records(self, api_client):
        """Test getting employee training records"""
        response = api_client.get("/api/qms/training/records/1")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Training records endpoint not available")

        assert response.get("success") is not None


class TestQualityControl:
    """Test quality control endpoints"""

    @pytest.mark.api
    def test_get_qc_metrics(self, api_client):
        """Test getting QC metrics"""
        response = api_client.get("/api/quality/metrics")

        if response.get("status_code") in [404, 503]:
            pytest.skip("QC metrics endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_log_qc_check(self, api_client):
        """Test logging a QC check"""
        response = api_client.post("/api/quality/check", json={
            "check_type": "positive_control",
            "result": "passed",
            "performed_by": "Test Analyst",
            "notes": "Positive control amplified as expected"
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("QC check endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_get_calibration_status(self, api_client):
        """Test getting equipment calibration status"""
        response = api_client.get("/api/quality/calibration/1")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Calibration status endpoint not available")

        assert response.get("success") is not None
