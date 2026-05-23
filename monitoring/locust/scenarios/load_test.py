"""
Load Test - Normal production load simulation
50 users, 5 minutes, simulates typical daily usage
"""

from locust import HttpUser, task, between, tag
import random


class LoadTestUser(HttpUser):
    """
    Simulates normal production load.
    Run: locust -f scenarios/load_test.py --headless -u 50 -r 5 -t 5m

    Expected results for healthy system:
    - 95th percentile < 500ms
    - Error rate < 1%
    - Requests/sec > 100
    """
    wait_time = between(1, 3)

    def on_start(self):
        self.client.post("/api/auth/login", json={
            "email": "demo@lims.local",
            "password": "demo123"
        })

    # High frequency operations (70% of load)
    @task(20)
    def health_check(self):
        self.client.get("/health")

    @task(15)
    def list_samples(self):
        self.client.get("/api/samples")

    @task(10)
    def list_cases(self):
        self.client.get("/api/cases")

    @task(10)
    def dashboard_stats(self):
        self.client.get("/api/dashboard/stats")

    @task(8)
    def get_sample(self):
        self.client.get(f"/api/samples/{random.randint(1, 100)}",
                       name="/api/samples/[id]")

    # Medium frequency operations (25% of load)
    @task(5)
    def list_paternity(self):
        self.client.get("/api/paternity")

    @task(5)
    def list_reports(self):
        self.client.get("/api/reports")

    @task(4)
    def list_inventory(self):
        self.client.get("/api/inventory")

    @task(3)
    def get_str_profiles(self):
        self.client.get("/api/genetic-analysis/profiles")

    # Low frequency operations (5% of load)
    @task(2)
    def create_sample(self):
        self.client.post("/api/samples", json={
            "sampleId": f"LOAD-{random.randint(10000, 99999)}",
            "type": "Blood",
            "status": "Received"
        })

    @task(1)
    def calculate_paternity(self):
        self.client.post("/api/paternity/calculate", json={
            "childId": random.randint(1, 50),
            "allegedFatherId": random.randint(51, 100)
        })
