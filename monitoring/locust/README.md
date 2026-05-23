# LIMS Load Testing with Locust

Load testing suite for the LIMS application using [Locust](https://locust.io/).

## Quick Start

### Start Locust on Server2

```bash
# Copy files to Server2
scp -r monitoring/locust server2:/home/jaime/portfolio/

# SSH into Server2
ssh server2

# Start Locust
cd /home/jaime/portfolio/locust
docker compose up -d

# Access Web UI
# http://192.168.50.74:8089 or http://100.103.13.92:8089
```

### Run Tests Headlessly

```bash
# Smoke Test (1 user, 1 minute)
docker compose run --rm locust-master \
  -f /mnt/locust/scenarios/smoke_test.py \
  --headless -u 1 -r 1 -t 1m \
  --host http://100.89.26.128:30007

# Load Test (50 users, 5 minutes)
docker compose run --rm locust-master \
  -f /mnt/locust/scenarios/load_test.py \
  --headless -u 50 -r 5 -t 5m \
  --host http://100.89.26.128:30007

# Stress Test (200 users, 10 minutes)
docker compose run --rm locust-master \
  -f /mnt/locust/scenarios/stress_test.py \
  --headless -u 200 -r 10 -t 10m \
  --host http://100.89.26.128:30007
```

## Test Scenarios

| Scenario | Users | Duration | Purpose |
|----------|-------|----------|---------|
| Smoke | 1 | 1 min | Verify endpoints work |
| Load | 50 | 5 min | Normal production load |
| Stress | 200 | 10 min | Find breaking points |

## Environment Targets

| Environment | Target URL | When to Test |
|-------------|------------|--------------|
| Test | http://100.89.26.128:30101 | After feature deploy |
| Develop | http://100.89.26.128:30201 | Before PR merge |
| Production | http://100.89.26.128:30007 | Scheduled/manual |

```bash
# Test against different environments
TARGET_HOST=http://100.89.26.128:30101 docker compose up -d  # Test
TARGET_HOST=http://100.89.26.128:30201 docker compose up -d  # Develop
TARGET_HOST=http://100.89.26.128:30007 docker compose up -d  # Production
```

## Test Endpoints

### Health Checks (High Priority)
- `GET /health` - Liveness
- `GET /ready` - Readiness

### Sample Management
- `GET /api/samples` - List samples
- `GET /api/samples/{id}` - Get sample
- `POST /api/samples` - Create sample

### Case Management
- `GET /api/cases` - List cases
- `GET /api/cases/{id}` - Get case

### Paternity Testing
- `GET /api/paternity` - List cases
- `POST /api/paternity/calculate` - Run calculation (CPU intensive)

### Reports
- `GET /api/reports` - List reports
- `POST /api/reports/generate` - Generate report (heavy)

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

## Prometheus Integration

Locust exporter exposes metrics at `http://server2:9646/metrics`

Add to Prometheus scrape config:
```yaml
- job_name: 'locust'
  static_configs:
    - targets: ['localhost:9646']
```

Metrics available:
- `locust_requests_total` - Total requests
- `locust_failures_total` - Failed requests
- `locust_response_time_percentile` - Response time percentiles
- `locust_current_users` - Current user count

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Load Test
  run: |
    ssh server2 "cd /home/jaime/portfolio/locust && \
      docker compose run --rm locust-master \
      -f /mnt/locust/scenarios/load_test.py \
      --headless -u 50 -r 5 -t 2m \
      --host http://100.89.26.128:30201 \
      --html /mnt/locust/reports/load-test-\$(date +%Y%m%d-%H%M%S).html"
```

## Reports

HTML reports are saved to `./reports/` directory:

```bash
# Generate HTML report
locust -f locustfile.py --headless -u 50 -r 5 -t 5m \
  --host http://100.89.26.128:30007 \
  --html reports/load-test-$(date +%Y%m%d-%H%M%S).html
```

## Troubleshooting

### Connection Refused
```bash
# Check target is accessible
curl http://100.89.26.128:30007/health
```

### High Error Rate
1. Check backend logs: `kubectl logs -n production -l app=lims-backend`
2. Check resource usage: `kubectl top pods -n production`
3. Check database connections

### Slow Response Times
1. Enable profiling in backend
2. Check database query times
3. Review resource limits in Helm values
