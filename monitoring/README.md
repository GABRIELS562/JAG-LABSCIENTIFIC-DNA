# Monitoring Stack

Complete observability stack for the LIMS DNA Analysis application.

## Quick Start

```bash
# Deploy the full monitoring stack
cd monitoring
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop stack
docker-compose down
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Server2 (Monitoring)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Prometheus  │  │   Grafana    │  │    Alertmanager      │  │
│  │    :9090     │  │    :3000     │  │       :9093          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
│         │                 │                                     │
│         │  ┌──────────────┴──────────────┐                     │
│         │  │           Loki              │                     │
│         │  │          :3100              │                     │
│         │  └─────────────────────────────┘                     │
│         │                                                       │
│  ┌──────┴───────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Node Exporter│  │   Promtail   │  │       Locust         │  │
│  │    :9100     │  │              │  │       :8089          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Scrapes metrics
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Server1 (K3s Cluster)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │  LIMS Test     │  │  LIMS Develop  │  │ LIMS Production│    │
│  │   :30101       │  │    :30201      │  │    :30007      │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│  ┌────────────────┐  ┌────────────────┐                        │
│  │  Pharma App    │  │  Finance App   │                        │
│  │   :30002       │  │    :30003      │                        │
│  └────────────────┘  └────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Purpose | Credentials |
|---------|------|---------|-------------|
| Prometheus | 9090 | Metrics collection & alerting | - |
| Grafana | 3000 | Visualization dashboards | admin/admin |
| Alertmanager | 9093 | Alert routing & notifications | - |
| Loki | 3100 | Log aggregation | - |
| Promtail | 9080 | Log shipping to Loki | - |
| Node Exporter | 9100 | System metrics | - |
| Locust | 8089 | Load testing UI | - |

## Scrape Targets

| Environment | Endpoint | Job Name | Metrics Path |
|-------------|----------|----------|--------------|
| Test | 100.89.26.128:30101 | lims-test | /metrics |
| Develop | 100.89.26.128:30201 | lims-develop | /metrics |
| Production | 100.89.26.128:30007 | lims-production | /metrics |
| Pharma | 100.89.26.128:30002 | portfolio-apps | /health |
| Finance | 100.89.26.128:30003 | portfolio-apps | /health |

## Grafana Dashboards

| Dashboard | Description |
|-----------|-------------|
| Portfolio Apps Overview | Health status of all portfolio applications |
| LIMS Application Metrics | Detailed LIMS metrics (requests, latency, workflows) |
| CI/CD Pipeline | Build times, deployment status, success rates |

### Importing Dashboards

```bash
# Via Grafana API
curl -X POST \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d @grafana/dashboards/lims-application.json \
  http://localhost:3000/api/dashboards/db

# Or manually:
# 1. Open http://localhost:3000
# 2. Dashboards → Import → Upload JSON
```

## Alert Rules

### Critical Alerts

| Alert | Condition | Duration |
|-------|-----------|----------|
| LIMSServiceDown | up == 0 | 1m |
| LIMSProductionUnhealthy | Production down | 30s |

### Warning Alerts

| Alert | Condition | Duration |
|-------|-----------|----------|
| LIMSHighErrorRate | >5 errors/sec | 2m |
| LIMSSlowResponses | p95 >2s | 5m |
| LIMSDatabaseConnectionsHigh | >18 connections | 5m |
| LIMSHighMemoryUsage | >450MB | 10m |
| LIMSWorkflowBacklog | >50 samples waiting | 15m |

## Directory Structure

```
monitoring/
├── docker-compose.yml          # Full monitoring stack
├── prometheus/
│   ├── prometheus.yml          # Scrape configuration
│   ├── rules/
│   │   └── lims-alerts.yml     # Recording rules
│   └── alerts/
│       └── app-alerts.yml      # Alerting rules
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/        # Auto-configured datasources
│   │   └── dashboards/         # Dashboard provisioning
│   └── dashboards/
│       ├── portfolio-overview.json
│       ├── lims-application.json
│       └── cicd-pipeline.json
├── alertmanager/
│   └── alertmanager.yml        # Alert routing config
├── loki/
│   ├── loki-config.yml         # Loki configuration
│   └── promtail-config.yml     # Log collection config
└── locust/
    ├── docker-compose.yml      # Locust stack
    ├── locustfile.py           # Load test scenarios
    └── scenarios/              # Additional test scenarios
```

## Deployment to Server2

### Initial Setup

```bash
# SSH to Server2
ssh jag@100.103.13.92

# Create monitoring directory
mkdir -p ~/portfolio/monitoring
cd ~/portfolio/monitoring

# Copy files from repo (run from local machine)
scp -r monitoring/* jag@100.103.13.92:~/portfolio/monitoring/

# Start the stack
docker-compose up -d
```

### Update Configuration

```bash
# Update Prometheus config
scp monitoring/prometheus/prometheus.yml jag@100.103.13.92:~/portfolio/monitoring/prometheus/
ssh jag@100.103.13.92 "cd ~/portfolio/monitoring && docker-compose restart prometheus"

# Reload Prometheus config (hot reload)
curl -X POST http://100.103.13.92:9090/-/reload

# Update Grafana dashboards
scp monitoring/grafana/dashboards/*.json jag@100.103.13.92:~/portfolio/monitoring/grafana/dashboards/
```

## Kubernetes Integration

For Prometheus Operator in Kubernetes, apply the ServiceMonitor:

```bash
kubectl apply -f k8s/monitoring/servicemonitor.yaml
```

This creates:
- ServiceMonitor for auto-discovering LIMS backend pods
- PodMonitor for direct pod scraping
- PrometheusRule with LIMS-specific alerts

## Load Testing with Locust

```bash
cd monitoring/locust

# Start Locust
docker-compose up -d

# Open UI: http://localhost:8089
# Target: http://100.89.26.128:30007 (production)

# Run headless test
docker-compose run --rm locust \
  -f /locust/locustfile.py \
  --headless \
  -u 50 -r 10 \
  -t 5m \
  --host http://100.89.26.128:30007
```

### Test Scenarios

| Scenario | Users | Duration | Purpose |
|----------|-------|----------|---------|
| Smoke | 1 | 1m | Verify endpoints |
| Load | 50 | 5m | Normal traffic |
| Stress | 200 | 10m | Find breaking point |

## Quick Health Checks

```bash
# Check all services
docker-compose ps

# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Check active alerts
curl -s http://localhost:9093/api/v2/alerts | jq '.[].labels.alertname'

# Check Loki
curl -s http://localhost:3100/ready

# Test LIMS metrics endpoint
curl -s http://100.89.26.128:30007/metrics | head -20
```

## Access URLs

| Service | Internal | Tailscale |
|---------|----------|-----------|
| Grafana | http://192.168.50.74:3000 | http://100.103.13.92:3000 |
| Prometheus | http://192.168.50.74:9090 | http://100.103.13.92:9090 |
| Alertmanager | http://192.168.50.74:9093 | http://100.103.13.92:9093 |
| Loki | http://192.168.50.74:3100 | http://100.103.13.92:3100 |
| Locust | http://192.168.50.74:8089 | http://100.103.13.92:8089 |

## Troubleshooting

### Prometheus not scraping targets

```bash
# Check target status
curl -s localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'

# Check network connectivity
curl -v http://100.89.26.128:30007/metrics
```

### Grafana datasource errors

```bash
# Verify Prometheus is accessible from Grafana container
docker exec grafana wget -qO- http://prometheus:9090/-/healthy
```

### Alerts not firing

```bash
# Check alerting rules
curl -s localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | {name: .name, state: .state}'

# Check Alertmanager
curl -s localhost:9093/api/v2/status | jq '.config'
```
