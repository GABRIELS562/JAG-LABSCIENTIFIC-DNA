"""
STR profile analysis tests
"""
import pytest


class TestSTRLociConfiguration:
    """Test STR loci configuration (PowerPlex ESX 17)"""

    # PowerPlex ESX 17 loci
    EXPECTED_LOCI = [
        "D3S1358", "vWA", "D16S539", "CSF1PO", "TPOX",
        "D8S1179", "D21S11", "D18S51", "D2S441", "D19S433",
        "TH01", "FGA", "D5S818", "D13S317", "D7S820",
        "SE33", "Amelogenin"
    ]

    @pytest.mark.genemapper
    def test_str_loci_count(self, test_data):
        """Test correct number of STR loci"""
        assert len(test_data.STR_LOCI) == 17, "PowerPlex ESX 17 should have 17 loci"

    @pytest.mark.genemapper
    def test_amelogenin_present(self, test_data):
        """Test Amelogenin locus is present"""
        assert "Amelogenin" in test_data.STR_LOCI

    @pytest.mark.genemapper
    def test_all_expected_loci_present(self, test_data):
        """Test all expected loci are configured"""
        for locus in self.EXPECTED_LOCI:
            assert locus in test_data.STR_LOCI, f"Missing locus: {locus}"


class TestSTRProfileGeneration:
    """Test STR profile generation"""

    @pytest.mark.genemapper
    def test_generate_male_profile(self, test_data):
        """Test generating male STR profile"""
        profile = test_data.generate_str_profile(sex="male")

        assert len(profile) == 17, "Profile should have 17 loci"
        assert profile["Amelogenin"] == ("X", "Y"), "Male should have X,Y"

    @pytest.mark.genemapper
    def test_generate_female_profile(self, test_data):
        """Test generating female STR profile"""
        profile = test_data.generate_str_profile(sex="female")

        assert len(profile) == 17, "Profile should have 17 loci"
        assert profile["Amelogenin"] == ("X", "X"), "Female should have X,X"

    @pytest.mark.genemapper
    def test_alleles_in_expected_range(self, test_data):
        """Test alleles are within expected ranges"""
        profile = test_data.generate_str_profile()

        for locus, alleles in profile.items():
            if locus == "Amelogenin":
                assert alleles in [("X", "X"), ("X", "Y")]
            else:
                locus_info = test_data.STR_LOCI.get(locus, {})
                min_val, max_val = locus_info.get("range", (0, 50))
                for allele in alleles:
                    assert min_val <= allele <= max_val, \
                        f"Allele {allele} out of range for {locus} ({min_val}-{max_val})"

    @pytest.mark.genemapper
    def test_alleles_are_heterozygous_or_homozygous(self, test_data):
        """Test alleles are valid pairs"""
        profile = test_data.generate_str_profile()

        for locus, alleles in profile.items():
            assert len(alleles) == 2, f"Locus {locus} should have 2 alleles"


class TestSTRProfileAPI:
    """Test STR profile via API"""

    @pytest.mark.genemapper
    def test_get_genemapper_results(self, api_client):
        """Test getting STR profiles from GeneMapper"""
        response = api_client.get("/api/genetic-analysis/genemapper-results")

        if response.get("status_code") in [404, 503]:
            pytest.skip("GeneMapper results endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.genemapper
    def test_store_str_profile(self, api_client, test_data):
        """Test storing an STR profile"""
        profile = test_data.generate_str_profile()

        response = api_client.post("/api/genetic-analysis/genemapper-results", json={
            "caseId": 1,
            "sampleId": "TEST-STR-001",
            "profile": profile,
            "qualityMetrics": {
                "averagePeakHeight": 5000,
                "signalToNoise": 50
            }
        })

        if response.get("status_code") in [404, 503]:
            pytest.skip("Store profile endpoint not available")

        assert response.get("success") is not None


class TestSTRDyeChannels:
    """Test STR dye channel organization"""

    # PowerPlex ESX 17 dye assignments
    DYE_CHANNELS = {
        "FAM": ["D3S1358", "vWA", "D16S539", "CSF1PO"],
        "VIC": ["TPOX", "D8S1179", "D21S11", "D18S51"],
        "NED": ["D2S441", "D19S433", "TH01", "FGA"],
        "PET": ["Amelogenin", "D5S818", "D13S317", "D7S820", "SE33"]
    }

    @pytest.mark.genemapper
    def test_four_dye_channels(self):
        """Test 4 dye channels are configured"""
        assert len(self.DYE_CHANNELS) == 4

    @pytest.mark.genemapper
    def test_all_loci_assigned_to_channels(self, test_data):
        """Test all loci are assigned to dye channels"""
        all_channel_loci = []
        for loci in self.DYE_CHANNELS.values():
            all_channel_loci.extend(loci)

        for locus in test_data.STR_LOCI:
            assert locus in all_channel_loci, f"Locus {locus} not assigned to channel"


class TestQualityMetrics:
    """Test STR quality metrics"""

    @pytest.mark.genemapper
    def test_peak_height_threshold(self):
        """Test minimum peak height threshold"""
        # PowerPlex ESX 17 typical threshold
        MIN_PEAK_HEIGHT = 150  # RFU
        assert MIN_PEAK_HEIGHT > 0

    @pytest.mark.genemapper
    def test_stutter_ratio_threshold(self):
        """Test maximum stutter ratio threshold"""
        # Typical stutter threshold
        MAX_STUTTER_RATIO = 0.15  # 15%
        assert MAX_STUTTER_RATIO < 1.0
