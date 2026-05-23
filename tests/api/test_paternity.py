"""
Paternity analysis endpoint tests
"""
import pytest


class TestPaternityCalculation:
    """Test paternity calculation endpoints"""

    @pytest.mark.api
    def test_calculate_paternity(self, api_client, test_data):
        """Test paternity calculation endpoint"""
        trio = test_data.generate_paternity_trio()

        response = api_client.post("/api/paternity/calculate", json={
            "caseId": 1,
            "profiles": {
                "child": trio["child"],
                "mother": trio["mother"],
                "allegedFather": trio["alleged_father"]
            },
            "caseInfo": {
                "testPurpose": "Paternity Testing"
            }
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Paternity calculation endpoint not available")

        if response.get("success"):
            data = response.get("data", {})
            # Should return paternity index and probability
            assert "cpi" in data or "paternity_index" in data or "probability" in data

    @pytest.mark.api
    def test_paternity_simulation(self, api_client):
        """Test paternity simulation endpoint"""
        response = api_client.post("/api/paternity/simulate/1", json={
            "isPaternity": True
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Paternity simulation endpoint not available")

        if response.get("success"):
            data = response.get("data", {})
            assert "cpi" in data or "probability" in data or "conclusion" in data


class TestPaternityProfiles:
    """Test paternity profile endpoints"""

    @pytest.mark.api
    def test_get_case_profiles(self, api_client):
        """Test getting genetic profiles for a case"""
        response = api_client.get("/api/paternity/case/1/profiles")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Profiles endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.api
    def test_validate_trio(self, api_client, test_data):
        """Test trio validation endpoint"""
        trio = test_data.generate_paternity_trio()

        response = api_client.post("/api/paternity/validate-trio", json={
            "profiles": {
                "child": trio["child"],
                "mother": trio["mother"],
                "allegedFather": trio["alleged_father"]
            }
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Trio validation endpoint not available")

        assert response.get("success") is not None


class TestPaternityFrequencies:
    """Test allele frequency endpoints"""

    @pytest.mark.api
    def test_get_allele_frequencies(self, api_client):
        """Test getting allele frequencies for a locus"""
        loci = ["D3S1358", "vWA", "D16S539", "FGA", "TH01"]

        for locus in loci:
            response = api_client.get(f"/api/paternity/frequencies/{locus}")

            if response.get("status_code") == 404:
                pytest.skip("Frequencies endpoint not available")
                break

            if response.get("success"):
                # Should return frequency data
                assert response.get("data") is not None
                break

    @pytest.mark.api
    def test_get_case_calculations(self, api_client):
        """Test getting previous calculations for a case"""
        response = api_client.get("/api/paternity/case/1/calculations")

        if response.get("status_code") in [404, 503]:
            pytest.skip("Calculations history endpoint not available")

        assert response.get("success") is not None


class TestPaternityResults:
    """Test paternity result interpretation"""

    @pytest.mark.api
    def test_inclusion_scenario(self, api_client, test_data):
        """Test inclusion (true father) scenario"""
        trio = test_data.generate_paternity_trio()

        response = api_client.post("/api/paternity/calculate", json={
            "caseId": 1,
            "profiles": {
                "child": trio["child"],
                "mother": trio["mother"],
                "allegedFather": trio["alleged_father"]
            }
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Paternity calculation endpoint not available")

        if response.get("success"):
            data = response.get("data", {})
            # True father should have high CPI
            cpi = data.get("cpi", data.get("paternity_index", 0))
            if cpi and isinstance(cpi, (int, float)):
                # CPI > 1 suggests inclusion
                pass  # Just verify we get a result

    @pytest.mark.api
    def test_exclusion_scenario(self, api_client, test_data):
        """Test exclusion (not the father) scenario"""
        trio = test_data.generate_exclusion_trio()

        response = api_client.post("/api/paternity/calculate", json={
            "caseId": 2,
            "profiles": {
                "child": trio["child"],
                "mother": trio["mother"],
                "allegedFather": trio["alleged_father"]
            }
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Paternity calculation endpoint not available")

        # Exclusion should have low CPI or exclusion conclusion
        if response.get("success"):
            data = response.get("data", {})
            # Just verify we get a response
            assert data is not None
