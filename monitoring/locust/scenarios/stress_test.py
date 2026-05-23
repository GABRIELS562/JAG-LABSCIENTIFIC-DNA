"""
Stress Test - Find breaking point
200 users ramping up, 10 minutes
Identifies system limits and failure modes
"""

from locust import HttpUser, task, between, LoadTestShape
import random


class StressTestUser(HttpUser):
    """
    Aggressive load to find breaking points.
    Run: locust -f scenarios/stress_test.py --headless -u 200 -r 10 -t 10m

    Watch for:
    - Response time degradation
    - Error rate increase
    - System resource exhaustion
    """
    wait_time = between(0.5, 1.5)  # Faster than normal

    def on_start(self):
        # Quick login attempt, don't fail if auth is down
        try:
            self.client.post("/api/auth/login", json={
                "email": "demo@lims.local",
                "password": "demo123"
            }, timeout=5)
        except:
            pass

    # Hammer the most common endpoints
    @task(25)
    def health_check(self):
        self.client.get("/health")

    @task(20)
    def list_samples(self):
        self.client.get("/api/samples")

    @task(15)
    def list_cases(self):
        self.client.get("/api/cases")

    @task(10)
    def get_sample(self):
        self.client.get(f"/api/samples/{random.randint(1, 100)}",
                       name="/api/samples/[id]")

    @task(10)
    def dashboard(self):
        self.client.get("/api/dashboard/stats")

    # CPU-intensive operations
    @task(5)
    def calculate_paternity(self):
        self.client.post("/api/paternity/calculate", json={
            "childId": random.randint(1, 100),
            "allegedFatherId": random.randint(1, 100)
        })

    # Write operations
    @task(3)
    def create_sample(self):
        self.client.post("/api/samples", json={
            "sampleId": f"STRESS-{random.randint(10000, 99999)}",
            "type": random.choice(["Blood", "Saliva"]),
            "status": "Received"
        })

    @task(2)
    def generate_report(self):
        self.client.post("/api/reports/generate", json={
            "caseId": random.randint(1, 50),
            "reportType": "paternity"
        }, timeout=30)


class StepLoadShape(LoadTestShape):
    """
    Step load pattern:
    - 0-2min: 20 users
    - 2-4min: 50 users
    - 4-6min: 100 users
    - 6-8min: 150 users
    - 8-10min: 200 users

    Use with: locust -f scenarios/stress_test.py --headless
    """
    stages = [
        {"duration": 120, "users": 20, "spawn_rate": 5},
        {"duration": 240, "users": 50, "spawn_rate": 5},
        {"duration": 360, "users": 100, "spawn_rate": 10},
        {"duration": 480, "users": 150, "spawn_rate": 10},
        {"duration": 600, "users": 200, "spawn_rate": 10},
    ]

    def tick(self):
        run_time = self.get_run_time()

        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])

        return None  # Stop test
