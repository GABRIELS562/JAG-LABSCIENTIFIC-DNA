# Monitoring Stack

This directory contains monitoring configurations for the LIMS application.

## Current Setup on Server2

| Service | Port | Purpose |
|---------|------|---------|
| Prometheus | 9090 | Metrics collection |
| Grafana | 3000 | Dashboards (admin/portfolio123) |
| Loki | 3100 | Log aggregation |
| Alertmanager | 9093 | Alert routing |
| Node Exporter | 9100 | System metrics |
| Promtail | - | Log shipping |

## Directory Structure

```
monitoring/
├── prometheus/
│   ├── prometheus.yml       # Scrape configuration
│   └── rules/
│       └── lims-alerts.yml  # Alerting rules
├── alertmanager/
│   └── alertmanager.yml     # Alert routing
├── grafana/
│   └── dashboards/
│       └── cicd-pipeline.json  # CI/CD dashboard
└── locust/                  # Load testing (Step 6)
```

## Scrape Targets

| Environment | Endpoint | Job Name |
|-------------|----------|----------|
| Test | 100.89.26.128:30101 | lims-test |
| Develop | 100.89.26.128:30201 | lims-develop |
| Production | 100.89.26.128:30007 | lims-production |

## Applying Changes to Server2

### Update Prometheus Config

```bash
# Copy new config
scp monitoring/prometheus/prometheus.yml server2:/home/jaime/portfolio/monitoring/prometheus/

# Copy alerting rules
scp -r monitoring/prometheus/rules server2:/home/jaime/portfolio/monitoring/prometheus/

# Restart Prometheus
ssh server2 "docker restart portfolio-prometheus"

# Verify config loaded
ssh server2 "curl -s localhost:9090/-/healthy"
```

### Update Alertmanager Config

```bash
# Copy config
scp monitoring/alertmanager/alertmanager.yml server2:/home/jaime/portfolio/monitoring/alertmanager/

# Restart Alertmanager
ssh server2 "docker restart portfolio-alertmanager"
```

### Import Grafana Dashboard

```bash
# Import via API
curl -X POST \
  -H "Content-Type: application/json" \
  -u admin:portfolio123 \
  -d @monitoring/grafana/dashboards/cicd-pipeline.json \
  http://server2:3000/api/dashboards/db
```

Or manually:
1. Go to http://192.168.50.74:3000
2. Login: admin / portfolio123
3. Dashboards → Import
4. Upload JSON file

## Alerting Rules

| Alert | Severity | Condition |
|-------|----------|-----------|
| LIMSBackendDown | critical | Backend unreachable >1m |
| LIMSHighErrorRate | warning | >5% error rate for 5m |
| LIMSHighLatency | warning | p95 >2s for 5m |
| LIMSHighMemory | warning | >85% memory for 5m |
| LIMSHighCPU | warning | >80% CPU for 5m |
| LIMSDiskSpaceLow | warning | <15% disk for 5m |
| LIMSProductionUnhealthy | critical | Production down >30s |

## Grafana Dashboards

### Existing Dashboards
- LIMS Dashboard
- LIMS Live Sample Pipeline Flow
- LIMS Processing Rate
- Server 1/2 CPU/Memory/Disk Usage

### New Dashboards
- **LIMS CI/CD Pipeline** - Environment status, request rates, latency

## Accessing Monitoring

| Service | Internal URL | Tailscale URL |
|---------|--------------|---------------|
| Grafana | http://192.168.50.74:3000 | http://100.103.13.92:3000 |
| Prometheus | http://192.168.50.74:9090 | http://100.103.13.92:9090 |
| Alertmanager | http://192.168.50.74:9093 | http://100.103.13.92:9093 |

## Quick Health Check

```bash
# Check all services
ssh server2 "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep portfolio"

# Check Prometheus targets
curl -s http://server2:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Check active alerts
curl -s http://server2:9093/api/v2/alerts | jq '.[].labels.alertname'
```
