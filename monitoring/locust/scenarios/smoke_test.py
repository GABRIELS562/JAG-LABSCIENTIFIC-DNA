"""
Smoke Test - Quick verification that endpoints are working
1 user, 1 minute, verifies basic functionality
"""

from locust import HttpUser, task, constant


class SmokeTestUser(HttpUser):
    """
    Minimal test to verify system is responsive.
    Run: locust -f scenarios/smoke_test.py --headless -u 1 -r 1 -t 1m
    """
    wait_time = constant(1)  # 1 second between requests

    @task(3)
    def health_check(self):
        """Verify health endpoint"""
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")

    @task(2)
    def ready_check(self):
        """Verify ready endpoint"""
        self.client.get("/ready")

    @task(2)
    def list_samples(self):
        """Verify samples endpoint"""
        self.client.get("/api/samples")

    @task(1)
    def list_cases(self):
        """Verify cases endpoint"""
        self.client.get("/api/cases")

    @task(1)
    def dashboard_stats(self):
        """Verify dashboard endpoint"""
        self.client.get("/api/dashboard/stats")

    def on_start(self):
        """Login at start"""
        self.client.post("/api/auth/login", json={
            "email": "demo@lims.local",
            "password": "demo123"
        })
