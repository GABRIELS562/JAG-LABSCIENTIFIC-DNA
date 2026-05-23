"""
LIMS Load Testing with Locust
Simulates realistic user behavior for DNA analysis lab workflows
"""

from locust import HttpUser, task, between, tag, events
import random
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LIMSUser(HttpUser):
    """
    Simulates a lab technician using the LIMS system.
    Realistic wait times between actions (2-5 seconds).
    """
    wait_time = between(2, 5)

    def on_start(self):
        """Called when a user starts - attempt login"""
        self.login()

    def login(self):
        """Authenticate user"""
        response = self.client.post("/api/auth/login", json={
            "email": "demo@lims.local",
            "password": "demo123"
        }, catch_response=True)

        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get("token", "")
                self.client.headers["Authorization"] = f"Bearer {self.token}"
                response.success()
            except:
                response.failure("Failed to parse login response")
        elif response.status_code == 401:
            # Demo user might not exist - continue without auth
            self.token = ""
            response.success()
        else:
            response.failure(f"Login failed: {response.status_code}")

    # ==================== Health Checks ====================

    @tag("health", "critical")
    @task(10)
    def health_check(self):
        """High frequency health check"""
        self.client.get("/health")

    @tag("health")
    @task(5)
    def ready_check(self):
        """Readiness check"""
        self.client.get("/ready")

    # ==================== Sample Management ====================

    @tag("samples", "read")
    @task(8)
    def list_samples(self):
        """List all samples - common operation"""
        self.client.get("/api/samples")

    @tag("samples", "read")
    @task(5)
    def get_sample_by_id(self):
        """Get specific sample details"""
        sample_id = random.randint(1, 100)
        self.client.get(f"/api/samples/{sample_id}", name="/api/samples/[id]")

    @tag("samples", "write")
    @task(2)
    def create_sample(self):
        """Create new sample"""
        sample_data = {
            "sampleId": f"SAMPLE-{random.randint(10000, 99999)}",
            "type": random.choice(["Blood", "Saliva", "Buccal Swab", "Hair"]),
            "collectionDate": "2024-01-15",
            "status": "Received",
            "caseNumber": f"CASE-{random.randint(1000, 9999)}"
        }
        self.client.post("/api/samples", json=sample_data)

    # ==================== Case Management ====================

    @tag("cases", "read")
    @task(6)
    def list_cases(self):
        """List all cases"""
        self.client.get("/api/cases")

    @tag("cases", "read")
    @task(3)
    def get_case_by_id(self):
        """Get specific case"""
        case_id = random.randint(1, 50)
        self.client.get(f"/api/cases/{case_id}", name="/api/cases/[id]")

    # ==================== Paternity Testing ====================

    @tag("paternity", "read")
    @task(4)
    def list_paternity_cases(self):
        """List paternity cases"""
        self.client.get("/api/paternity")

    @tag("paternity", "compute")
    @task(2)
    def calculate_paternity(self):
        """Run paternity calculation - CPU intensive"""
        calculation_data = {
            "childId": random.randint(1, 50),
            "allegedFatherId": random.randint(51, 100),
            "motherId": random.randint(101, 150)
        }
        with self.client.post("/api/paternity/calculate",
                              json=calculation_data,
                              catch_response=True) as response:
            if response.status_code in [200, 201, 404]:
                response.success()
            else:
                response.failure(f"Calculation failed: {response.status_code}")

    # ==================== Genetic Analysis ====================

    @tag("genetic", "read")
    @task(4)
    def list_str_profiles(self):
        """List STR profiles"""
        self.client.get("/api/genetic-analysis/profiles")

    @tag("genetic", "read")
    @task(3)
    def get_analysis_results(self):
        """Get analysis results"""
        self.client.get("/api/genetic-analysis/results")

    # ==================== Reports ====================

    @tag("reports", "read")
    @task(3)
    def list_reports(self):
        """List generated reports"""
        self.client.get("/api/reports")

    @tag("reports", "generate")
    @task(1)
    def generate_report(self):
        """Generate a report - heavy operation"""
        report_data = {
            "caseId": random.randint(1, 50),
            "reportType": random.choice(["paternity", "forensic", "kinship"])
        }
        with self.client.post("/api/reports/generate",
                              json=report_data,
                              catch_response=True,
                              timeout=30) as response:
            if response.status_code in [200, 201, 202, 404]:
                response.success()

    # ==================== Inventory ====================

    @tag("inventory", "read")
    @task(2)
    def check_inventory(self):
        """Check reagent inventory"""
        self.client.get("/api/inventory")

    # ==================== Dashboard ====================

    @tag("dashboard", "read")
    @task(5)
    def get_dashboard_stats(self):
        """Get dashboard statistics"""
        self.client.get("/api/dashboard/stats")


class APIOnlyUser(HttpUser):
    """
    Simulates API-only access (integrations, automated systems).
    Faster request rate, focused on data endpoints.
    """
    wait_time = between(0.5, 2)
    weight = 1  # Lower weight than main user

    @task(10)
    def health_check(self):
        self.client.get("/health")

    @task(5)
    def get_samples(self):
        self.client.get("/api/samples")

    @task(3)
    def get_metrics(self):
        """Prometheus metrics endpoint"""
        self.client.get("/metrics")


# ==================== Event Hooks ====================

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts"""
    logger.info(f"Load test starting against {environment.host}")
    logger.info(f"Target users: {environment.parsed_options.num_users if hasattr(environment, 'parsed_options') else 'N/A'}")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops"""
    logger.info("Load test completed")

    # Log summary stats
    stats = environment.stats
    logger.info(f"Total requests: {stats.total.num_requests}")
    logger.info(f"Failures: {stats.total.num_failures}")
    logger.info(f"Avg response time: {stats.total.avg_response_time:.2f}ms")


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Called on each request - can be used for custom metrics"""
    if exception:
        logger.warning(f"Request failed: {name} - {exception}")
