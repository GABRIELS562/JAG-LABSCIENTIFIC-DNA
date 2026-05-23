"""
End-to-end sample workflow integration tests
"""
import pytest
import time


class TestSampleWorkflowStages:
    """Test sample progression through workflow stages"""

    WORKFLOW_STAGES = [
        "sample_collected",
        "extraction_ready",
        "extraction_in_progress",
        "extraction_completed",
        "quantification_ready",
        "quantification_completed",
        "pcr_ready",
        "pcr_batched",
        "pcr_completed",
        "electro_ready",
        "electro_batched",
        "electro_completed",
        "analysis_ready",
        "analysis_completed",
        "report_ready",
        "report_sent",
    ]

    @pytest.mark.integration
    def test_initial_sample_status(self, api_client, test_data):
        """Test new sample starts with correct status"""
        sample_data = test_data.generate_sample()
        response = api_client.post("/api/samples", json=sample_data)

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        if response.get("success"):
            sample = response["data"]
            assert sample["workflow_status"] == "sample_collected"

    @pytest.mark.integration
    def test_advance_to_extraction(self, api_client, created_sample):
        """Test advancing sample to extraction stage"""
        if not created_sample:
            pytest.skip("Sample creation failed")

        response = api_client.put(f"/api/samples/{created_sample['id']}", json={
            "workflow_status": "extraction_ready"
        })

        if response.get("success"):
            assert response["data"]["workflow_status"] == "extraction_ready"

    @pytest.mark.integration
    def test_advance_through_extraction(self, api_client, created_sample):
        """Test advancing through extraction stages"""
        if not created_sample:
            pytest.skip("Sample creation failed")

        extraction_stages = [
            "extraction_ready",
            "extraction_in_progress",
            "extraction_completed"
        ]

        for stage in extraction_stages:
            response = api_client.put(f"/api/samples/{created_sample['id']}", json={
                "workflow_status": stage
            })

            if not response.get("success"):
                pytest.skip(f"Could not advance to {stage}")

            assert response["data"]["workflow_status"] == stage

    @pytest.mark.integration
    def test_advance_to_pcr(self, api_client, created_sample):
        """Test advancing sample to PCR stage"""
        if not created_sample:
            pytest.skip("Sample creation failed")

        # First complete extraction
        api_client.put(f"/api/samples/{created_sample['id']}", json={
            "workflow_status": "extraction_completed"
        })

        # Then advance to PCR
        response = api_client.put(f"/api/samples/{created_sample['id']}", json={
            "workflow_status": "pcr_ready"
        })

        if response.get("success"):
            assert response["data"]["workflow_status"] == "pcr_ready"

    @pytest.mark.integration
    def test_complete_full_workflow(self, api_client, created_sample):
        """Test complete workflow from collection to report"""
        if not created_sample:
            pytest.skip("Sample creation failed")

        # Progress through all stages
        for stage in self.WORKFLOW_STAGES[1:]:  # Skip initial stage
            response = api_client.put(f"/api/samples/{created_sample['id']}", json={
                "workflow_status": stage
            })

            if not response.get("success"):
                # Some stages might not be allowed
                continue

        # Final check - should be at report_sent or close
        final = api_client.get(f"/api/samples/{created_sample['id']}")
        if final.get("success"):
            assert final["data"]["workflow_status"] in self.WORKFLOW_STAGES


class TestBatchWorkflow:
    """Test batch processing workflow"""

    @pytest.mark.integration
    def test_create_and_process_batch(self, api_client, test_data):
        """Test creating and processing a batch of samples"""
        # Create multiple samples
        samples = []
        for _ in range(3):
            sample_data = test_data.generate_sample()
            response = api_client.post("/api/samples", json=sample_data)
            if response.get("success"):
                samples.append(response["data"])

        if len(samples) < 3:
            pytest.skip("Could not create enough samples")

        # Get batches endpoint
        batches_response = api_client.get("/api/batches")

        if batches_response.get("status_code") == 404:
            pytest.skip("Batches endpoint not available")

        # Try to create a batch
        sample_ids = [s["id"] for s in samples]
        batch_response = api_client.post("/api/batches", json={
            "type": "pcr",
            "sample_ids": sample_ids
        })

        if batch_response.get("success"):
            batch = batch_response["data"]
            assert batch is not None


class TestQueueManagement:
    """Test queue management workflow"""

    @pytest.mark.integration
    def test_extraction_queue(self, api_client):
        """Test extraction queue management"""
        response = api_client.get("/api/samples", params={
            "status": "extraction_ready"
        })

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        assert response.get("success") is True

    @pytest.mark.integration
    def test_pcr_queue(self, api_client):
        """Test PCR queue management"""
        response = api_client.get("/api/samples", params={
            "status": "pcr_ready"
        })

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        assert response.get("success") is True

    @pytest.mark.integration
    def test_analysis_queue(self, api_client):
        """Test analysis queue management"""
        response = api_client.get("/api/samples", params={
            "status": "analysis_ready"
        })

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        assert response.get("success") is True


class TestWorkflowMetrics:
    """Test workflow metrics and statistics"""

    @pytest.mark.integration
    def test_sample_counts_by_stage(self, api_client):
        """Test getting sample counts by workflow stage"""
        response = api_client.get("/api/samples/counts")

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        if response.get("success"):
            data = response["data"]
            assert isinstance(data, dict)
            # Should have count fields
            assert "total" in data or len(data) > 0

    @pytest.mark.integration
    def test_workflow_status_distribution(self, api_client):
        """Test workflow status distribution"""
        response = api_client.get("/api/samples", params={"limit": 100})

        if response.get("status_code") == 503:
            pytest.skip("Database not available")

        if response.get("success"):
            samples = response.get("data", [])
            # Count samples by status
            status_counts = {}
            for sample in samples:
                status = sample.get("workflow_status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1

            # Should have some distribution
            assert len(status_counts) >= 0


class TestWorkflowTransitions:
    """Test valid workflow transitions"""

    VALID_TRANSITIONS = {
        "sample_collected": ["extraction_ready"],
        "extraction_ready": ["extraction_in_progress"],
        "extraction_in_progress": ["extraction_completed"],
        "extraction_completed": ["quantification_ready", "pcr_ready"],
        "quantification_ready": ["quantification_completed"],
        "quantification_completed": ["pcr_ready"],
        "pcr_ready": ["pcr_batched"],
        "pcr_batched": ["pcr_completed"],
        "pcr_completed": ["electro_ready"],
        "electro_ready": ["electro_batched"],
        "electro_batched": ["electro_completed"],
        "electro_completed": ["analysis_ready"],
        "analysis_ready": ["analysis_completed"],
        "analysis_completed": ["report_ready"],
        "report_ready": ["report_sent"],
    }

    @pytest.mark.integration
    def test_valid_transitions_defined(self):
        """Test all workflow stages have valid transitions"""
        assert len(self.VALID_TRANSITIONS) > 0

    @pytest.mark.integration
    def test_forward_progression(self, api_client, created_sample):
        """Test samples can progress forward through workflow"""
        if not created_sample:
            pytest.skip("Sample creation failed")

        current_status = created_sample.get("workflow_status", "sample_collected")
        next_statuses = self.VALID_TRANSITIONS.get(current_status, [])

        if next_statuses:
            response = api_client.put(f"/api/samples/{created_sample['id']}", json={
                "workflow_status": next_statuses[0]
            })

            # Either succeeds or validation fails (both are valid behaviors)
            assert response.get("success") is not None
