# Service Level Objectives (SLOs)

This document defines the SLOs, SLIs, and error budgets for JAG LabScientific LIMS.

## Overview

| Service | Availability SLO | Latency SLO (p99) | Error Budget |
|---------|------------------|-------------------|--------------|
| Frontend | 99.5% | < 500ms | 3.6 hours/month |
| Backend API | 99.9% | < 200ms | 43 minutes/month |
| Database | 99.95% | < 50ms | 21 minutes/month |

## Service Level Indicators (SLIs)

### Availability SLI

**Definition**: Percentage of successful requests (non-5xx responses)

```promql
# Availability calculation
sum(rate(http_requests_total{status!~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```

### Latency SLI

**Definition**: Percentage of requests completing within threshold

```promql
# P99 latency
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)
```

### Error Rate SLI

**Definition**: Percentage of requests resulting in errors

```promql
# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```

## Detailed SLOs

### 1. Frontend Availability

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| Availability | 99.5% | Rolling 30 days |
| Error Budget | 3.6 hours | Per month |

**Alerting Thresholds**:
- Warning: Availability < 99.7% (1 hour window)
- Critical: Availability < 99.5% (1 hour window)

### 2. Backend API

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| Availability | 99.9% | Rolling 30 days |
| P99 Latency | < 200ms | Rolling 5 minutes |
| Error Rate | < 0.1% | Rolling 5 minutes |
| Error Budget | 43 minutes | Per month |

**Alerting Thresholds**:

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | > 1% for 5m | Warning |
| Critical Error Rate | > 5% for 2m | Critical |
| High Latency | P99 > 500ms for 5m | Warning |
| Critical Latency | P99 > 1s for 2m | Critical |
| Error Budget Burn | > 10%/hour | Warning |
| Error Budget Critical | > 50% consumed | Critical |

### 3. Database

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| Availability | 99.95% | Rolling 30 days |
| Query Latency (P99) | < 50ms | Rolling 5 minutes |
| Connection Pool | > 20% available | Continuous |
| Error Budget | 21 minutes | Per month |

## Error Budget Policy

### Budget Consumption Thresholds

| Budget Remaining | Action |
|-----------------|--------|
| > 50% | Normal operations |
| 25-50% | Reduce deployment frequency |
| 10-25% | Feature freeze, stability focus |
| < 10% | Emergency mode, incident response only |

### Budget Calculation

```
Monthly Error Budget (minutes) = 30 days × 24 hours × 60 minutes × (1 - SLO)

Example for 99.9% SLO:
= 43,200 minutes × 0.001
= 43.2 minutes/month
```

### Budget Burn Rate

```promql
# Burn rate over last hour
(
  1 - (
    sum(rate(http_requests_total{status!~"5.."}[1h]))
    /
    sum(rate(http_requests_total[1h]))
  )
) / (1 - 0.999) # For 99.9% SLO
```

## Prometheus Rules

```yaml
# slo-rules.yaml
groups:
  - name: slo-rules
    rules:
      # Availability SLI
      - record: sli:availability:ratio
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m]))

      # Latency SLI (P99)
      - record: sli:latency:p99
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          )

      # Error rate
      - record: sli:error_rate:ratio
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m]))

      # Error budget burn rate (1 hour)
      - record: slo:error_budget:burn_rate_1h
        expr: |
          1 - sli:availability:ratio / 0.999

      # Error budget remaining
      - record: slo:error_budget:remaining
        expr: |
          1 - (
            sum_over_time(sli:error_rate:ratio[30d])
            /
            (30 * 24 * 60) * (1 - 0.999)
          )
```

## Alerting Rules

```yaml
# slo-alerts.yaml
groups:
  - name: slo-alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: sli:error_rate:ratio > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Error rate above 1%"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Critical error rate
      - alert: CriticalErrorRate
        expr: sli:error_rate:ratio > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 5%"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Error budget burn
      - alert: ErrorBudgetBurn
        expr: slo:error_budget:burn_rate_1h > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Error budget burning too fast"
          description: "Burning {{ $value | humanizePercentage }} of budget per hour"

      # Error budget exhausted
      - alert: ErrorBudgetExhausted
        expr: slo:error_budget:remaining < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error budget nearly exhausted"
          description: "Only {{ $value | humanizePercentage }} of budget remaining"

      # High latency
      - alert: HighLatency
        expr: sli:latency:p99 > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency above 500ms"
          description: "P99 latency is {{ $value | humanizeDuration }}"
```

## Grafana Dashboard

### Key Panels

1. **Availability Over Time**
   - Graph showing SLI vs SLO target
   - 30-day rolling window

2. **Error Budget Remaining**
   - Gauge showing percentage remaining
   - Color coded (green > 50%, yellow 25-50%, red < 25%)

3. **Latency Distribution**
   - Heatmap of request latencies
   - P50, P90, P99 overlays

4. **Error Budget Burn Rate**
   - Current burn rate vs sustainable rate
   - Projection to exhaustion

### Dashboard JSON

See `monitoring/grafana/dashboards/slo-dashboard.json`

## Review Cadence

| Review Type | Frequency | Attendees |
|-------------|-----------|-----------|
| SLO Review | Monthly | Engineering, Product |
| Error Budget Review | Weekly | Engineering |
| Incident Review | After each SEV1/2 | All stakeholders |

## SLO Change Process

1. Propose change with justification
2. Review historical data
3. Assess impact on error budget
4. Get stakeholder approval
5. Update alerting thresholds
6. Document in this file
