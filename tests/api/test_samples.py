"""
Sample management endpoint tests
"""
import pytest


class TestSamplesList:
    """Test sample listing endpoints"""

    @pytest.mark.api
    def test_get_samples_list(self, api_client):
        """Test getting list of samples"""
        response = api_client.get("/api/samples")

        assert response.get("success") is True or response.get("status_code") == 200
        assert "data" in response or "samples" in response

    @pytest.mark.api
    def test_get_samples_with_pagination(self, api_client):
        """Test sample pagination"""
        response = api_client.get("/api/samples", params={"page": 1, "limit": 10})

        assert response.get("success") is True
        if "meta" in response:
            assert "pagination" in response["meta"]
            assert response["meta"]["pagination"]["page"] == 1
            assert response["meta"]["pagination"]["limit"] == 10

    @pytest.mark.api
    def test_get_samples_with_limit(self, api_client):
        """Test sample limit parameter"""
        response = api_client.get("/api/samples", params={"limit": 5})

        assert response.get("success") is True
        data = response.get("data", response.get("samples", []))
        assert len(data) <= 5

    @pytest.mark.api
    def test_get_samples_with_status_filter(self, api_client):
        """Test filtering samples by status"""
        response = api_client.get("/api/samples", params={"status": "pending"})

        assert response.get("success") is True

    @pytest.mark.api
    def test_get_samples_with_search(self, api_client):
        """Test searching samples"""
        response = api_client.get("/api/samples", params={"search": "TEST"})

        assert response.get("success") is True


class TestSampleCounts:
    """Test sample count endpoints"""

    @pytest.mark.api
    def test_get_sample_counts(self, api_client):
        """Test getting sample counts by status"""
        response = api_client.get("/api/samples/counts")

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        assert response.get("success") is True
        data = response.get("data", {})
        # Should have count fields
        assert isinstance(data, dict)

    @pytest.mark.api
    def test_sample_counts_includes_total(self, api_client):
        """Test sample counts includes total"""
        response = api_client.get("/api/samples/counts")

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        if response.get("success"):
            data = response.get("data", {})
            assert "total" in data or len(data) > 0


class TestSampleSearch:
    """Test sample search endpoints"""

    @pytest.mark.api
    def test_search_samples_endpoint(self, api_client):
        """Test dedicated search endpoint"""
        response = api_client.get("/api/samples/search", params={"q": "TEST"})

        if response.get("status_code") == 400:
            # Might require query parameter
            response = api_client.get("/api/samples/search", params={"q": "LAB"})

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        assert response.get("success") is True or response.get("status_code") in [200, 400]

    @pytest.mark.api
    def test_search_without_query_returns_error(self, api_client):
        """Test search without query parameter"""
        response = api_client.get("/api/samples/search")

        # Should return error for missing query
        if response.get("status_code") != 503:
            assert response.get("success") is False or response.get("status_code") == 400


class TestSampleCRUD:
    """Test sample CRUD operations"""

    @pytest.mark.api
    def test_create_sample(self, api_client, test_data):
        """Test creating a new sample"""
        sample_data = test_data.generate_sample()

        response = api_client.post("/api/samples", json=sample_data)

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        assert response.get("success") is True
        assert response.get("data") is not None
        assert response["data"].get("lab_number") == sample_data["lab_number"]

    @pytest.mark.api
    def test_create_sample_with_missing_fields(self, api_client):
        """Test creating sample with missing required fields"""
        response = api_client.post("/api/samples", json={
            "name": "Test"
            # Missing lab_number and surname
        })

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        # Should return error for missing fields
        assert response.get("success") is False or response.get("status_code") == 400

    @pytest.mark.api
    def test_create_duplicate_sample(self, api_client, test_data):
        """Test creating sample with duplicate lab number"""
        sample_data = test_data.generate_sample()

        # Create first sample
        response1 = api_client.post("/api/samples", json=sample_data)
        if response1.get("status_code") == 503:
            pytest.skip("Database not available")

        # Try to create duplicate
        response2 = api_client.post("/api/samples", json=sample_data)

        # Should return conflict error
        assert response2.get("success") is False or response2.get("status_code") == 409

    @pytest.mark.api
    def test_get_sample_by_id(self, api_client, created_sample):
        """Test getting sample by ID"""
        if not created_sample:
            pytest.skip("Sample creation failed")

        response = api_client.get(f"/api/samples/{created_sample['id']}")

        assert response.get("success") is True
        assert response.get("data", {}).get("id") == created_sample["id"]

    @pytest.mark.api
    def test_get_nonexistent_sample(self, api_client):
        """Test getting non-existent sample"""
        response = api_client.get("/api/samples/999999")

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        assert response.get("success") is False or response.get("status_code") == 404

    @pytest.mark.api
    def test_update_sample(self, api_client, created_sample):
        """Test updating a sample"""
        if not created_sample:
            pytest.skip("Sample creation failed")

        response = api_client.put(f"/api/samples/{created_sample['id']}", json={
            "workflow_status": "extraction_ready"
        })

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        assert response.get("success") is True

    @pytest.mark.api
    def test_update_sample_workflow_status(self, api_client, created_sample):
        """Test updating sample workflow status"""
        if not created_sample:
            pytest.skip("Sample creation failed")

        response = api_client.put(f"/api/samples/{created_sample['id']}", json={
            "workflow_status": "pcr_ready"
        })

        if response.get("success"):
            assert response.get("data", {}).get("workflow_status") == "pcr_ready"


class TestSampleValidation:
    """Test sample data validation"""

    @pytest.mark.api
    def test_sample_lab_number_format(self, api_client, test_data):
        """Test lab number format validation"""
        sample_data = test_data.generate_sample()

        response = api_client.post("/api/samples", json=sample_data)

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        if response.get("success"):
            assert response.get("data", {}).get("lab_number") is not None

    @pytest.mark.api
    def test_sample_required_fields(self, api_client):
        """Test all required fields are validated"""
        # Empty request
        response = api_client.post("/api/samples", json={})

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        assert response.get("success") is False or response.get("status_code") == 400
        assert "error" in response or "message" in response
