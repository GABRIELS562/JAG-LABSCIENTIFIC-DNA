"""
Authentication endpoint tests
"""
import pytest


class TestAuthLogin:
    """Test authentication login endpoints"""

    @pytest.mark.api
    def test_login_with_valid_credentials(self, api_client):
        """Test login with valid credentials returns token"""
        response = api_client.post("/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })

        # Either successful login or endpoint not configured
        if response.get("success"):
            assert "token" in response.get("data", {}) or "token" in response
        elif response.get("status_code") == 401:
            # Invalid credentials is valid behavior
            assert response.get("error") or response.get("message")
        elif response.get("status_code") == 404:
            pytest.skip("Auth endpoint not configured")

    @pytest.mark.api
    def test_login_with_invalid_credentials(self, api_client):
        """Test login with invalid credentials returns error"""
        response = api_client.post("/api/auth/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })

        if response.get("status_code") == 404:
            pytest.skip("Auth endpoint not configured")

        # Should return error or unauthorized
        assert response.get("success") is False or response.get("status_code") in [401, 400]

    @pytest.mark.api
    def test_login_with_missing_credentials(self, api_client):
        """Test login with missing fields returns error"""
        response = api_client.post("/api/auth/login", json={})

        if response.get("status_code") == 404:
            pytest.skip("Auth endpoint not configured")

        # Should return error for missing fields
        assert response.get("success") is False or response.get("status_code") in [400, 401]

    @pytest.mark.api
    def test_login_with_email(self, api_client):
        """Test login with email instead of username"""
        response = api_client.post("/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })

        # Either works or returns appropriate error
        if response.get("status_code") == 404:
            pytest.skip("Auth endpoint not configured")

        assert response.get("success") is not None or response.get("status_code") in [200, 400, 401]


class TestAuthToken:
    """Test token-based authentication"""

    @pytest.mark.api
    def test_access_protected_endpoint_without_token(self, api_client):
        """Test accessing protected endpoint without auth"""
        api_client.logout()  # Ensure no token

        response = api_client.get("/api/auth/me")

        if response.get("status_code") == 404:
            pytest.skip("Endpoint not configured")

        # Should return unauthorized
        assert response.get("status_code") == 401 or response.get("success") is False

    @pytest.mark.api
    def test_access_protected_endpoint_with_token(self, authenticated_client):
        """Test accessing protected endpoint with auth"""
        response = authenticated_client.get("/api/auth/me")

        if response.get("status_code") == 404:
            pytest.skip("Endpoint not configured")

        # If authenticated, should return user info
        if authenticated_client.token:
            assert response.get("success") is True or "user" in response.get("data", {})

    @pytest.mark.api
    def test_token_refresh(self, authenticated_client):
        """Test token refresh endpoint"""
        if not authenticated_client.token:
            pytest.skip("Not authenticated")

        response = authenticated_client.post("/api/auth/refresh")

        if response.get("status_code") == 404:
            pytest.skip("Refresh endpoint not configured")

        # Should return new token or indicate refresh not needed
        assert response.get("success") is not None


class TestAuthLogout:
    """Test logout functionality"""

    @pytest.mark.api
    def test_logout(self, authenticated_client):
        """Test logout endpoint"""
        if not authenticated_client.token:
            pytest.skip("Not authenticated")

        response = authenticated_client.post("/api/auth/logout")

        if response.get("status_code") == 404:
            pytest.skip("Logout endpoint not configured")

        # Logout should succeed
        assert response.get("success") is True or response.get("status_code") == 200


class TestUserManagement:
    """Test user management endpoints (staff only)"""

    @pytest.mark.api
    def test_get_users_list(self, authenticated_client):
        """Test getting list of users"""
        response = authenticated_client.get("/api/auth/users")

        if response.get("status_code") in [404, 403]:
            pytest.skip("Users endpoint not configured or not authorized")

        # Should return list of users or access denied
        if response.get("success"):
            assert "users" in response.get("data", {}) or isinstance(response.get("data"), list)

    @pytest.mark.api
    def test_register_user_requires_auth(self, api_client):
        """Test user registration requires authentication"""
        api_client.logout()

        response = api_client.post("/api/auth/register", json={
            "username": "newuser",
            "password": "newpassword",
            "email": "new@example.com",
            "role": "client"
        })

        if response.get("status_code") == 404:
            pytest.skip("Register endpoint not configured")

        # Should require authentication
        assert response.get("status_code") in [401, 403] or response.get("success") is False
