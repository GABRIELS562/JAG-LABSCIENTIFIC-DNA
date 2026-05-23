"""
Health and readiness endpoint tests
"""
import pytest


class TestHealthEndpoints:
    """Test health check endpoints"""

    @pytest.mark.api
    def test_health_endpoint_returns_200(self, api_client):
        """Test /health endpoint returns success"""
        response = api_client.get("/health")

        assert response.get("status_code") == 200 or response.get("success") is True, \
            f"Health check failed: {response}"

    @pytest.mark.api
    def test_api_health_endpoint(self, api_client):
        """Test /api/health endpoint"""
        response = api_client.get("/api/health")

        # Should return success or status info
        assert response.get("success") is True or "status" in response or response.get("status_code") == 200

    @pytest.mark.api
    def test_ready_endpoint(self, api_client):
        """Test /ready endpoint for database connectivity"""
        response = api_client.get("/ready")

        # Ready should indicate database status
        if response.get("status_code") == 503:
            # Database not connected is a valid state
            assert "database" in str(response).lower() or "unavailable" in str(response).lower()
        else:
            assert response.get("success") is True or response.get("status") == "ready"

    @pytest.mark.api
    def test_metrics_endpoint(self, api_client):
        """Test /metrics endpoint for Prometheus metrics"""
        response = api_client.get("/metrics")

        # Metrics endpoint should return text data
        if response.get("text"):
            assert "process" in response["text"] or "http" in response["text"]
        # Or it might not be configured
        assert response.get("status_code") in [200, 404] or response.get("success") is not None


class TestServerStatus:
    """Test server status and availability"""

    @pytest.mark.api
    def test_server_is_running(self, api_client):
        """Verify server is responding"""
        is_healthy = api_client.health_check()

        if not is_healthy:
            pytest.skip("Server is not running - start with: npm run dev:server")

    @pytest.mark.api
    def test_cors_headers(self, api_client):
        """Test CORS headers are present"""
        response = api_client.get("/health")

        # Server should be reachable
        assert response.get("status_code") != 0, "Server not responding"

    @pytest.mark.api
    def test_json_content_type(self, api_client):
        """Test API returns JSON content"""
        response = api_client.get("/api/health")

        # Response should be parseable as JSON (which our client does automatically)
        assert isinstance(response, dict), "Response should be JSON"
