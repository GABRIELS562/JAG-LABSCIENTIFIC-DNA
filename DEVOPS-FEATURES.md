# LIMS DevOps Demonstration Features

This LIMS application has been enhanced with comprehensive DevOps monitoring and demonstration capabilities to showcase real-world DevOps skills and observability practices.

## 🚀 Overview

The application now generates continuous, realistic activity and metrics that demonstrate:
- **Monitoring & Observability**: Prometheus metrics, structured logging, health checks
- **Performance Testing**: Load generation, stress testing, performance issue simulation
- **Incident Management**: Error simulation, alerting scenarios, debugging capabilities
- **Scalability**: Queue monitoring, auto-scaling triggers, capacity planning
- **Reliability**: Health probes, readiness checks, graceful degradation

## 📈 Key Features Implemented

### 1. Prometheus Metrics Endpoint (`/metrics`)

**Purpose**: Expose application and business metrics for monitoring systems.

**Metrics Collected**:
```
# HTTP Request Metrics
http_request_duration_seconds_bucket{method="GET",route="/api/samples",status_code="200",le="0.1"}
http_requests_total{method="GET",route="/api/samples",status_code="200"}
http_request_errors_total{method="GET",route="/api/samples",error_type="server_error"}

# Business Metrics
lims_samples_processed_total{status="completed",workflow_stage="pcr"}
lims_batches_created_total{batch_type="pcr"}
lims_queue_size{queue_type="pcr_ready"}

# Database Metrics
database_queries_total{operation="SELECT",table="samples"}
database_query_duration_seconds_bucket{operation="SELECT",table="samples",le="0.1"}

# Application Metrics
lims_active_users
memory_leak_simulation_total
cpu_intensive_operations_total
```

**DevOps Value**:
- Enable Grafana dashboards
- Set up AlertManager rules
- Track SLIs and SLOs
- Monitor business KPIs

**Access**: `GET /metrics`

### 2. Background Job Simulation

**Purpose**: Generate continuous system activity for realistic monitoring.

**Jobs Running**:
- **Sample Processing** (every 30s): Simulates laboratory workflow
- **API Traffic Generation** (every 15s): Creates realistic endpoint usage
- **Batch Processing** (every 2min): Simulates batch creation and completion
- **User Activity** (every 45s): Simulates login/logout and user actions
- **Queue Updates** (every 20s): Updates processing queue sizes
- **System Metrics** (every 1min): Logs performance data

**Benefits**:
- Provides data for monitoring dashboards
- Enables alerting rule testing
- Generates log entries for aggregation
- Shows realistic system load patterns

**Management**: 
- Status: `GET /admin/jobs/status`
- Trigger: `POST /admin/jobs/trigger/:jobName`

### 3. Health & Readiness Probes

**Kubernetes-Compatible Endpoints**:

```yaml
# Kubernetes Deployment Example
livenessProbe:
  httpGet:
    path: /health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

**Endpoints**:
- `/health` - Comprehensive health check
- `/health/live` - Liveness probe (basic)
- `/health/ready` - Readiness probe (with dependencies)

**Checks Performed**:
- Database connectivity
- File system access
- Memory utilization
- Disk space
- Process health

### 4. Performance Issue Simulation

**Purpose**: Demonstrate monitoring, alerting, and debugging capabilities.

#### Intentionally Slow Endpoint
```bash
curl http://localhost:3001/performance/slow
# Response time: 3-5 seconds
# Demonstrates: Slow query monitoring, response time alerts
```

#### Unreliable Endpoint (10% Error Rate)
```bash
curl http://localhost:3001/performance/unreliable
# 90% success, 10% random errors (500, 503, 429, 502)
# Demonstrates: Error rate monitoring, reliability metrics
```

#### Memory Leak Simulation
```bash
curl -X POST http://localhost:3001/performance/memory-leak \
  -H "Content-Type: application/json" \
  -d '{"size":1000,"iterations":10}'
# Demonstrates: Memory monitoring, leak detection, cleanup
```

#### CPU Intensive Operations
```bash
curl -X POST http://localhost:3001/performance/cpu-intensive \
  -H "Content-Type: application/json" \
  -d '{"duration":5000,"complexity":500000}'
# Demonstrates: CPU monitoring, resource alerts
```

### 5. Load Generation System

**Comprehensive Load Testing**:

```bash
# Quick load test
npm run load-test:light

# Heavy load test
npm run load-test:heavy

# Custom load test
node backend/scripts/runLoadTest.js --concurrency 10 --duration 120
```

**Realistic Scenarios**:
- User login/logout cycles
- Sample management workflows
- Batch processing operations
- Report generation
- Search operations
- Dashboard monitoring

**Metrics Collected**:
- Request/response rates
- Success/failure rates
- Response time percentiles
- Error breakdown
- Throughput analysis

### 6. Structured Logging with Winston

**Multi-Level Logging**:
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Sample processing completed",
  "sampleId": 12345,
  "processingTime": 2340,
  "workflowStage": "pcr",
  "operator": "user123"
}
```

**Log Types**:
- **Application logs**: Business logic events
- **Error logs**: Exceptions and failures
- **Audit logs**: User actions and data changes
- **Performance logs**: Slow operations and bottlenecks
- **Security logs**: Authentication and authorization events

**Benefits**:
- Easy parsing for log aggregation (ELK, Splunk)
- Structured data for analytics
- Contextual debugging information
- Compliance and audit trails

### 7. Admin Dashboard (`/admin`)

**Real-Time DevOps Interface**:
- System health monitoring
- Performance testing controls
- Load test management
- Memory and CPU monitoring
- Background job status
- Quick access to all endpoints

**Features**:
- One-click performance issue triggers
- Real-time load test monitoring
- System resource visualization
- Activity log streaming
- Direct links to all DevOps endpoints

## 🛠️ Usage Examples

### Basic Health Monitoring
```bash
# Check overall system health
curl http://localhost:3001/health | jq .

# Kubernetes liveness check
curl http://localhost:3001/health/live

# Kubernetes readiness check
curl http://localhost:3001/health/ready
```

### Metrics Collection
```bash
# Get Prometheus metrics
curl http://localhost:3001/metrics

# Monitor specific metrics
curl http://localhost:3001/metrics | grep "http_requests_total"
curl http://localhost:3001/metrics | grep "lims_samples_processed"
```

### Performance Testing
```bash
# Test slow endpoint
time curl http://localhost:3001/performance/slow

# Test unreliable endpoint (run multiple times)
for i in {1..20}; do curl -w "\n" http://localhost:3001/performance/unreliable; done

# Check memory status
curl http://localhost:3001/performance/memory-status | jq .

# Trigger memory leak
curl -X POST http://localhost:3001/performance/memory-leak \
  -H "Content-Type: application/json" \
  -d '{"size":1000,"iterations":5}'

# Clean up memory leak
curl -X DELETE http://localhost:3001/performance/memory-leak
```

### Load Testing
```bash
# Light load test (3 users, 30 seconds)
npm run load-test:light

# Heavy load test (10 users, 2 minutes)
npm run load-test:heavy

# Custom load test
node backend/scripts/runLoadTest.js --concurrency 5 --duration 60
```

### Background Jobs Management
```bash
# Check job status
curl http://localhost:3001/admin/jobs/status | jq .

# Manually trigger a job
curl -X POST http://localhost:3001/admin/jobs/trigger/sample-processing

# Start/stop load testing via API
curl -X POST http://localhost:3001/admin/load-test/start \
  -H "Content-Type: application/json" \
  -d '{"concurrency":5,"duration":60}'

curl -X POST http://localhost:3001/admin/load-test/stop
```

## 📉 DevOps Integration Examples

### Prometheus Configuration
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'lims-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: /metrics
    scrape_interval: 15s
```

### Grafana Dashboard Queries
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_request_errors_total[5m]) / rate(http_requests_total[5m])

# Response time percentiles
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Business metrics
rate(lims_samples_processed_total[5m])
lims_queue_size
```

### AlertManager Rules
```yaml
groups:
  - name: lims-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "LIMS error rate is {{ $value | humanizePercentage }}"
      
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "LIMS 95th percentile response time is {{ $value }}s"
      
      - alert: ServiceDown
        expr: up{job="lims-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "LIMS backend service is down"
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lims-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: lims-backend
  template:
    metadata:
      labels:
        app: lims-backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/path: "/metrics"
        prometheus.io/port: "3001"
    spec:
      containers:
      - name: lims-backend
        image: lims-backend:latest
        ports:
        - containerPort: 3001
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### HPA Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: lims-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: lims-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 📊 Monitoring Stack Integration

### ELK Stack (Elasticsearch, Logstash, Kibana)
```yaml
# docker-compose.yml for ELK
version: '3.7'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
  
  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    depends_on:
      - elasticsearch
    ports:
      - "5044:5044"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
  
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    depends_on:
      - elasticsearch
    ports:
      - "5601:5601"
```

### Filebeat Configuration
```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /path/to/lims/backend/logs/application-*.log
  fields:
    service: lims-backend
    environment: production
  fields_under_root: true
  json.keys_under_root: true
  json.add_error_key: true

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "lims-logs-%{+yyyy.MM.dd}"

logging.level: info
```

## 🎯 Performance Testing Scenarios

### Scenario 1: Baseline Performance
```bash
# Test normal operation
npm run load-test:light
# Expected: >99% success rate, <500ms avg response time
```

### Scenario 2: Stress Testing
```bash
# Test under heavy load
npm run load-test:heavy
# Expected: >95% success rate, <1000ms avg response time
```

### Scenario 3: Reliability Testing
```bash
# Test with simulated issues
curl -X POST http://localhost:3001/performance/memory-leak \
  -d '{"size":2000,"iterations":20}'
npm run load-test
# Expected: Degraded performance, memory alerts
```

### Scenario 4: Recovery Testing
```bash
# Clean up and test recovery
curl -X DELETE http://localhost:3001/performance/memory-leak
curl -X POST http://localhost:3001/admin/gc
npm run load-test:light
# Expected: Performance returns to baseline
```

## 🚀 Quick Start Guide

1. **Start the Application**:
   ```bash
   npm run server
   ```

2. **Open DevOps Dashboard**:
   ```bash
   open http://localhost:3001/admin
   ```

3. **Check Metrics**:
   ```bash
   curl http://localhost:3001/metrics | head -20
   ```

4. **Run Load Test**:
   ```bash
   npm run load-test:light
   ```

5. **Simulate Issues**:
   - Use the admin dashboard buttons
   - Or run CLI commands for specific tests

6. **Monitor Results**:
   - Watch the activity log in admin dashboard
   - Check metrics endpoint for changes
   - Monitor system resources

## 📝 NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run devops:start` | Start the LIMS backend with DevOps features |
| `npm run devops:dashboard` | Open the admin dashboard |
| `npm run devops:health` | Check system health via CLI |
| `npm run devops:metrics` | Display current metrics |
| `npm run devops:memory-status` | Check memory usage |
| `npm run devops:performance-test` | Run quick performance tests |
| `npm run devops:trigger-issues` | Simulate performance issues |
| `npm run load-test` | Run standard load test |
| `npm run load-test:light` | Run light load test (3 users, 30s) |
| `npm run load-test:heavy` | Run heavy load test (10 users, 2min) |

## 🎆 Benefits for DevOps Demonstration

This enhanced LIMS application provides:

1. **Real Activity**: Continuous background jobs generate realistic system activity
2. **Observable Issues**: Intentional performance problems to demonstrate monitoring
3. **Comprehensive Metrics**: Business and technical metrics for dashboard creation
4. **Testing Capabilities**: Built-in load testing for performance validation
5. **Health Monitoring**: Kubernetes-ready health and readiness probes
6. **Structured Logging**: JSON logs ready for aggregation and analysis
7. **Admin Interface**: Easy-to-use dashboard for demonstrations
8. **Scalability Triggers**: Queue sizes and metrics that justify auto-scaling
9. **Alert Scenarios**: Error rates and performance issues that trigger alerts
10. **Recovery Testing**: Memory cleanup and performance recovery capabilities

Perfect for showcasing:
- Monitoring and alerting setup
- Performance optimization
- Scalability planning
- Incident response
- Observability best practices
- DevOps toolchain integration
