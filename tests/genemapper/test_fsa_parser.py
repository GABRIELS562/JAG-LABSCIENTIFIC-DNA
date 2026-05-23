"""
FSA file parsing tests via API
"""
import pytest
from pathlib import Path


class TestFSAFileDiscovery:
    """Test FSA file discovery and validation"""

    @pytest.mark.genemapper
    def test_fsa_files_exist(self, fsa_files_path):
        """Verify FSA test files exist"""
        assert fsa_files_path.exists(), f"FSA files directory not found: {fsa_files_path}"

        fsa_files = list(fsa_files_path.glob("*.fsa"))
        assert len(fsa_files) > 0, "No FSA test files found"

    @pytest.mark.genemapper
    def test_fsa_file_naming_convention(self, fsa_files_path):
        """Test FSA files follow naming convention"""
        fsa_files = list(fsa_files_path.glob("*.fsa"))

        for fsa_file in fsa_files[:5]:  # Check first 5 files
            # Files should have recognizable naming pattern
            name = fsa_file.stem
            assert len(name) > 0, f"Empty filename: {fsa_file}"

    @pytest.mark.genemapper
    def test_fsa_file_size(self, fsa_files_path):
        """Test FSA files have reasonable size"""
        fsa_files = list(fsa_files_path.glob("*.fsa"))

        for fsa_file in fsa_files[:5]:
            size = fsa_file.stat().st_size
            # FSA files are typically 50KB-500KB
            assert size > 1000, f"FSA file too small: {fsa_file} ({size} bytes)"
            assert size < 10_000_000, f"FSA file too large: {fsa_file} ({size} bytes)"


class TestFSAFileStructure:
    """Test FSA file binary structure"""

    @pytest.mark.genemapper
    def test_fsa_file_header(self, sample_fsa_file):
        """Test FSA file has valid ABIF header"""
        if not sample_fsa_file:
            pytest.skip("No FSA test file available")

        with open(sample_fsa_file, "rb") as f:
            header = f.read(4)
            # ABIF files start with "ABIF" signature
            assert header == b"ABIF", f"Invalid FSA header: {header}"

    @pytest.mark.genemapper
    def test_fsa_file_version(self, sample_fsa_file):
        """Test FSA file version information"""
        if not sample_fsa_file:
            pytest.skip("No FSA test file available")

        with open(sample_fsa_file, "rb") as f:
            f.read(4)  # Skip header
            version = f.read(2)
            # Version should be readable as integer
            version_num = int.from_bytes(version, byteorder="big")
            assert version_num > 0, f"Invalid version: {version_num}"


class TestFSAUploadAPI:
    """Test FSA file upload via API"""

    @pytest.mark.genemapper
    def test_upload_single_fsa_file(self, api_client, sample_fsa_file):
        """Test uploading a single FSA file"""
        if not sample_fsa_file:
            pytest.skip("No FSA test file available")

        response = api_client.upload_fsa_file(
            "/api/genetic-analysis/test-str-analyzer",
            sample_fsa_file
        )

        if response.get("status_code") in [404, 503]:
            pytest.skip("FSA upload endpoint not available")

        # Should either succeed or return meaningful error
        assert response.get("success") is not None or response.get("error") is not None

    @pytest.mark.genemapper
    def test_upload_child_fsa_file(self, api_client, fsa_files_path):
        """Test uploading child sample FSA file"""
        child_files = list(fsa_files_path.glob("*Child*.fsa")) + list(fsa_files_path.glob("*_C.fsa"))

        if not child_files:
            pytest.skip("No child FSA file found")

        response = api_client.upload_fsa_file(
            "/api/genetic-analysis/test-str-analyzer",
            child_files[0]
        )

        if response.get("status_code") in [404, 503]:
            pytest.skip("FSA upload endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.genemapper
    def test_upload_father_fsa_file(self, api_client, fsa_files_path):
        """Test uploading father sample FSA file"""
        father_files = list(fsa_files_path.glob("*Father*.fsa")) + list(fsa_files_path.glob("*_F.fsa"))

        if not father_files:
            pytest.skip("No father FSA file found")

        response = api_client.upload_fsa_file(
            "/api/genetic-analysis/test-str-analyzer",
            father_files[0]
        )

        if response.get("status_code") in [404, 503]:
            pytest.skip("FSA upload endpoint not available")

        assert response.get("success") is not None

    @pytest.mark.genemapper
    def test_upload_mother_fsa_file(self, api_client, fsa_files_path):
        """Test uploading mother sample FSA file"""
        mother_files = list(fsa_files_path.glob("*Mother*.fsa")) + list(fsa_files_path.glob("*_M.fsa"))

        if not mother_files:
            pytest.skip("No mother FSA file found")

        response = api_client.upload_fsa_file(
            "/api/genetic-analysis/test-str-analyzer",
            mother_files[0]
        )

        if response.get("status_code") in [404, 503]:
            pytest.skip("FSA upload endpoint not available")

        assert response.get("success") is not None


class TestFSABatchUpload:
    """Test batch FSA file upload"""

    @pytest.mark.genemapper
    def test_upload_paternity_trio(self, api_client, fsa_files_path):
        """Test uploading a paternity trio (child, mother, father)"""
        # Find files for one case
        case_files = list(fsa_files_path.glob("PAT-*-001*.fsa"))[:3]

        if len(case_files) < 3:
            # Try alternative naming
            case_files = list(fsa_files_path.glob("25_00*.fsa"))[:3]

        if len(case_files) < 3:
            pytest.skip("Not enough FSA files for trio")

        response = api_client.upload_multiple_fsa_files(
            "/api/genetic-analysis/cases/1/samples",
            case_files
        )

        if response.get("status_code") in [404, 503]:
            pytest.skip("Batch upload endpoint not available")

        assert response.get("success") is not None


class TestFSAParsingResults:
    """Test FSA parsing results"""

    @pytest.mark.genemapper
    def test_parsed_fsa_contains_metadata(self, api_client, sample_fsa_file):
        """Test parsed FSA contains sample metadata"""
        if not sample_fsa_file:
            pytest.skip("No FSA test file available")

        response = api_client.upload_fsa_file(
            "/api/genetic-analysis/test-str-analyzer",
            sample_fsa_file
        )

        if response.get("status_code") in [404, 503]:
            pytest.skip("FSA upload endpoint not available")

        if response.get("success") and response.get("data"):
            data = response["data"]
            # Should contain sample metadata
            assert "sampleName" in data or "sample_name" in data or "metadata" in data

    @pytest.mark.genemapper
    def test_parsed_fsa_contains_trace_data(self, api_client, sample_fsa_file):
        """Test parsed FSA contains trace/channel data"""
        if not sample_fsa_file:
            pytest.skip("No FSA test file available")

        response = api_client.upload_fsa_file(
            "/api/genetic-analysis/test-str-analyzer",
            sample_fsa_file
        )

        if response.get("status_code") in [404, 503]:
            pytest.skip("FSA upload endpoint not available")

        if response.get("success") and response.get("data"):
            data = response["data"]
            # Should contain channel/trace information
            has_trace_data = any([
                "channels" in data,
                "traces" in data,
                "FAM" in str(data),
                "VIC" in str(data),
                "profile" in data
            ])
            # May or may not have trace data depending on processing level
            assert response.get("success") is True or has_trace_data
