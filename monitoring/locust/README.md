# LIMS Load Testing with Locust

Performance and load testing for the LIMS DNA Analysis application.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start Locust with web UI
docker-compose up -d

# Open UI: http://localhost:8089
# Enter target host: http://100.89.26.128:30007

# Scale workers for more load
docker-compose up -d --scale locust-worker=4

# Stop
docker-compose down
```

### Using Python Directly

```bash
# Install dependencies
pip install -r requirements.txt

# Run with web UI
locust -f locustfile.py --host http://100.89.26.128:30007

# Run headless
locust -f locustfile.py \
  --headless \
  --host http://100.89.26.128:30007 \
  --users 50 \
  --spawn-rate 5 \
  --run-time 5m
```

### Using the Runner Script

```bash
# Make executable
chmod +x run-load-test.sh

# Run smoke test (1 user, 1 min)
./run-load-test.sh smoke

# Run load test (50 users, 5 min)
./run-load-test.sh load

# Run stress test (200 users, 10 min)
./run-load-test.sh stress

# Custom test
./run-load-test.sh custom 100 10 5m
```

## Test Scenarios

### Main Test File (`locustfile.py`)

Simulates realistic lab technician behavior with weighted tasks:

| Task | Weight | Description |
|------|--------|-------------|
| Health Check | 10 | `/health` endpoint |
| List Samples | 8 | GET `/api/samples` |
| List Cases | 6 | GET `/api/cases` |
| Dashboard | 5 | GET `/api/dashboard/stats` |
| Get Sample | 5 | GET `/api/samples/{id}` |
| Paternity Calc | 2 | POST `/api/paternity/calculate` |
| Create Sample | 2 | POST `/api/samples` |
| Generate Report | 1 | POST `/api/reports/generate` |

### Smoke Test (`scenarios/smoke_test.py`)

Quick verification that system is working.

```bash
locust -f scenarios/smoke_test.py --headless -u 1 -r 1 -t 1m --host http://localhost:30007
```

- **Users:** 1
- **Duration:** 1 minute
- **Purpose:** Verify endpoints are responsive
- **Pass Criteria:** <1% failure rate, <1000ms avg response

### Load Test (`scenarios/load_test.py`)

Simulate normal production traffic.

```bash
locust -f scenarios/load_test.py --headless -u 50 -r 5 -t 5m --host http://localhost:30007
```

- **Users:** 50
- **Duration:** 5 minutes
- **Purpose:** Verify system handles normal load
- **Pass Criteria:** <5% failure rate, <2000ms avg response

### Stress Test (`scenarios/stress_test.py`)

Find system breaking point with stepped load.

```bash
locust -f scenarios/stress_test.py --headless --host http://localhost:30007
```

- **Users:** 20 → 50 → 100 → 150 → 200 (stepped)
- **Duration:** 10 minutes
- **Purpose:** Identify capacity limits
- **Watch For:**
  - Response time degradation
  - Error rate increase
  - Resource exhaustion

## Environment Targets

| Environment | Endpoint | Use Case |
|-------------|----------|----------|
| Test | http://100.89.26.128:30101 | Feature branch testing |
| Develop | http://100.89.26.128:30201 | Integration testing |
| Production | http://100.89.26.128:30007 | Baseline & monitoring |

```bash
# Test against different environments
TARGET_HOST=http://100.89.26.128:30101 docker-compose up -d  # Test
TARGET_HOST=http://100.89.26.128:30201 docker-compose up -d  # Develop
TARGET_HOST=http://100.89.26.128:30007 docker-compose up -d  # Production
```

## Performance Targets

### Acceptable Performance

| Metric | Target |
|--------|--------|
| p50 Response Time | < 100ms |
| p95 Response Time | < 500ms |
| p99 Response Time | < 1000ms |
| Error Rate | < 1% |
| Throughput | > 100 req/s |

### Warning Thresholds

| Metric | Warning |
|--------|---------|
| p95 Response Time | > 500ms |
| Error Rate | > 1% |
| CPU Usage | > 80% |
| Memory Usage | > 85% |

## Metrics & Monitoring

### Prometheus Exporter

The docker-compose includes a Prometheus exporter on port 9646.

```yaml
# Add to prometheus.yml
- job_name: 'locust'
  static_configs:
    - targets: ['localhost:9646']
```

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `locust_users` | Gauge | Current number of users |
| `locust_requests_total` | Counter | Total requests by endpoint |
| `locust_requests_fail_total` | Counter | Failed requests by endpoint |
| `locust_requests_avg_response_time` | Gauge | Average response time |
| `locust_requests_50_response_time` | Gauge | Median response time |
| `locust_requests_95_response_time` | Gauge | 95th percentile |
| `locust_requests_99_response_time` | Gauge | 99th percentile |

### Grafana Dashboard

Import `../grafana/dashboards/locust-load-testing.json` for a pre-built dashboard.

## CI/CD Integration

Load tests run automatically after deployments to develop:

```yaml
# Trigger: Push to develop → Deploy → Load Test (smoke)
# Manual: Actions → Load Testing → Run workflow
```

See `.github/workflows/load-test.yml` for configuration.

### GitHub Actions Inputs

| Input | Options | Description |
|-------|---------|-------------|
| `test_type` | smoke, load, stress | Test scenario |
| `target_env` | test, develop, production | Target environment |
| `users` | number | Custom user count |
| `duration` | e.g., 1m, 5m | Custom duration |

## Results & Reports

### Output Files

| File | Description |
|------|-------------|
| `*_report.html` | Interactive HTML report |
| `*_stats.csv` | Request statistics |
| `*_failures.csv` | Failure details |
| `*_stats_history.csv` | Time-series data |
| `summary.json` | Machine-readable summary |

### Pass/Fail Criteria

| Test | Max Failure Rate | Max Avg Response |
|------|------------------|------------------|
| Smoke | 1% | 1000ms |
| Load | 5% | 2000ms |
| Stress | 10% | 5000ms |

## Deploy to Server2

```bash
# Copy files to Server2
scp -r monitoring/locust jag@100.103.13.92:~/portfolio/

# SSH into Server2 and start
ssh jag@100.103.13.92
cd ~/portfolio/locust
docker-compose up -d

# Access Web UI: http://100.103.13.92:8089
```

## Troubleshooting

### Connection Refused

```bash
# Check target is accessible
curl -v http://100.89.26.128:30007/health

# Check Tailscale connectivity
tailscale status
```

### High Failure Rate

- Check application logs: `kubectl logs -l app=lims -n production`
- Verify database connectivity
- Check resource limits (CPU, memory)

### Slow Response Times

- Check database query performance
- Review application profiling
- Consider scaling replicas

### Worker Connection Issues

```bash
# Restart workers
docker-compose restart locust-worker

# Check master logs
docker-compose logs locust-master
```
