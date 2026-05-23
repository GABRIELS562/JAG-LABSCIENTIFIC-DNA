"""
API Client wrapper for testing JAG-LABSCIENTIFIC-DNA endpoints
"""
import requests
from typing import Optional, Dict, Any, Union
from pathlib import Path


class APIClient:
    """HTTP client for API testing with authentication support"""

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.token: Optional[str] = None
        self.timeout = 30

    def _get_headers(self) -> Dict[str, str]:
        """Get headers with optional auth token"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def _make_request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Make HTTP request and return JSON response"""
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers()

        # Handle file uploads
        if "files" in kwargs:
            headers.pop("Content-Type", None)

        try:
            response = self.session.request(
                method=method,
                url=url,
                headers=headers,
                timeout=self.timeout,
                **kwargs
            )

            # Try to parse JSON, fallback to text
            try:
                return response.json()
            except ValueError:
                return {
                    "success": response.ok,
                    "status_code": response.status_code,
                    "text": response.text
                }

        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "error": "Connection refused - is the server running?",
                "status_code": 0
            }
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Request timeout",
                "status_code": 0
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "status_code": 0
            }

    def get(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """GET request"""
        return self._make_request("GET", endpoint, params=params)

    def post(
        self,
        endpoint: str,
        json: Optional[Dict] = None,
        data: Optional[Dict] = None,
        files: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """POST request"""
        return self._make_request("POST", endpoint, json=json, data=data, files=files)

    def put(self, endpoint: str, json: Optional[Dict] = None) -> Dict[str, Any]:
        """PUT request"""
        return self._make_request("PUT", endpoint, json=json)

    def patch(self, endpoint: str, json: Optional[Dict] = None) -> Dict[str, Any]:
        """PATCH request"""
        return self._make_request("PATCH", endpoint, json=json)

    def delete(self, endpoint: str) -> Dict[str, Any]:
        """DELETE request"""
        return self._make_request("DELETE", endpoint)

    def login(self, username: str, password: str) -> bool:
        """Login and store token"""
        response = self.post("/api/auth/login", json={
            "username": username,
            "password": password
        })

        if response.get("success") and response.get("data", {}).get("token"):
            self.token = response["data"]["token"]
            return True
        elif response.get("token"):
            self.token = response["token"]
            return True

        return False

    def logout(self) -> None:
        """Clear token"""
        self.token = None

    def upload_fsa_file(self, endpoint: str, file_path: Union[str, Path]) -> Dict[str, Any]:
        """Upload FSA file"""
        file_path = Path(file_path)
        if not file_path.exists():
            return {"success": False, "error": f"File not found: {file_path}"}

        with open(file_path, "rb") as f:
            files = {"file": (file_path.name, f, "application/octet-stream")}
            return self.post(endpoint, files=files)

    def upload_multiple_fsa_files(
        self,
        endpoint: str,
        file_paths: list
    ) -> Dict[str, Any]:
        """Upload multiple FSA files"""
        files = []
        for path in file_paths:
            path = Path(path)
            if path.exists():
                files.append(
                    ("files", (path.name, open(path, "rb"), "application/octet-stream"))
                )

        if not files:
            return {"success": False, "error": "No valid files to upload"}

        try:
            return self.post(endpoint, files=files)
        finally:
            # Close all file handles
            for _, (_, file_handle, _) in files:
                file_handle.close()

    def health_check(self) -> bool:
        """Check if server is healthy"""
        response = self.get("/health")
        return response.get("status_code", 0) == 200 or response.get("success", False)

    def is_ready(self) -> bool:
        """Check if server is ready (database connected)"""
        response = self.get("/ready")
        return response.get("success", False) or response.get("status") == "ready"
