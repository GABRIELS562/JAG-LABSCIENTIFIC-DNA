# 📊 JAGDNA LIMS - Monitoring Access Guide

## 🎯 Quick Access URLs

After running the setup, you can access the monitoring tools at:

| Service | URL | Username | Password |
|---------|-----|----------|----------|
| **Grafana** | http://192.168.50.100:30300 | admin | admin123 |
| **Prometheus** | http://192.168.50.100:30090 | - | - |
| **Kibana** | http://192.168.50.100:30561 | - | - |
| **Application** | http://192.168.50.100:30080 | - | - |

---

## 🔍 1. Grafana Dashboard Access

### Direct Browser Access:
```bash
# Open in browser
http://192.168.50.100:30300

# Login credentials
Username: admin
Password: admin123
```

### Port Forwarding (if NodePort not working):
```bash
# From your local machine
ssh -L 3000:localhost:3000 jaime@192.168.50.100
# Then on the server:
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80

# Access at: http://localhost:3000
```

### Setting Up Dashboards:

1. **Import Pre-built Kubernetes Dashboard:**
   - Click "+" → "Import"
   - Enter ID: `12740` (Kubernetes Cluster Monitoring)
   - Select "Prometheus" as data source
   - Click "Import"

2. **Import Application Dashboard:**
   - Click "+" → "Import"
   - Paste the JSON from `grafana-dashboard.json`
   - Click "Load"

3. **Useful Dashboard IDs:**
   - `12740` - Kubernetes Cluster Monitoring
   - `3662` - Prometheus 2.0 Overview
   - `1860` - Node Exporter Full
   - `9614` - NGINX Ingress Controller

---

## 📈 2. Prometheus Access

### Direct Access:
```bash
http://192.168.50.100:30090
```

### Useful Queries:

```promql
# Pod CPU Usage
sum(rate(container_cpu_usage_seconds_total{namespace="production"}[5m])) by (pod)

# Pod Memory Usage
sum(container_memory_usage_bytes{namespace="production"}) by (pod) / 1024 / 1024

# Request Rate (if nginx metrics configured)
sum(rate(nginx_ingress_controller_requests[5m])) by (status)

# Pod Restart Count
kube_pod_container_status_restarts_total{namespace="production"}

# Available Pods
count(up{namespace="production"} == 1)

# HPA Current Replicas
kube_horizontalpodautoscaler_status_current_replicas{namespace="production"}

# Backend Health Check
up{job="jagdna-backend"}
```

---

## 📋 3. Kibana (Logs) Access

### Direct Access:
```bash
http://192.168.50.100:30561
```

### First Time Setup:
1. Wait 2-3 minutes for Elasticsearch to collect logs
2. Go to "Stack Management" → "Index Patterns"
3. Create index pattern: `logstash-*`
4. Select `@timestamp` as time field
5. Go to "Discover" to view logs

### Useful Queries:
```
# View production namespace logs
kubernetes.namespace_name: "production"

# View backend logs
kubernetes.labels.app: "jagdna-backend"

# View frontend logs
kubernetes.labels.app: "jagdna-frontend"

# Error logs
level: "error" OR level: "ERROR"

# Specific pod logs
kubernetes.pod_name: "jagdna-backend-*"
```

---

## 🎬 4. Demo Scenarios

### Scenario 1: Show Pod Auto-healing
```bash
# Terminal 1: Watch Grafana dashboard
# Browser: http://192.168.50.100:30300

# Terminal 2: Delete a pod
kubectl delete pod jagdna-frontend-[pod-id] -n production

# Watch in Grafana: Pod count drops then recovers
```

### Scenario 2: Generate Load & Watch Metrics
```bash
# Terminal 1: Generate load
for i in {1..1000}; do
  curl -s http://192.168.50.100:30080/api/samples > /dev/null &
done

# Watch in Grafana:
# - CPU usage spikes
# - Request rate increases
# - Memory usage changes
```

### Scenario 3: Check Application Logs
```bash
# In Kibana (http://192.168.50.100:30561)
# Search: kubernetes.labels.app: "jagdna-backend"
# See real-time logs from all backend pods
```

---

## 🛠️ 5. Troubleshooting

### If Grafana shows "No Data":
```bash
# Check Prometheus targets
curl http://192.168.50.100:30090/targets

# Check ServiceMonitor
kubectl get servicemonitor -n production

# Check if metrics endpoint works
kubectl exec -n production jagdna-backend-[pod-id] -- curl localhost:3001/metrics
```

### If Kibana shows no logs:
```bash
# Check Fluentd pods
kubectl get pods -n monitoring -l app=fluentd

# Check Elasticsearch
kubectl logs -n monitoring deployment/elasticsearch

# Restart Fluentd
kubectl rollout restart daemonset/fluentd -n monitoring
```

### Check All Services:
```bash
# Quick status check
kubectl get pods -n monitoring

# Get service URLs
kubectl get svc -n monitoring

# Check pod logs
kubectl logs -n monitoring deployment/monitoring-grafana
kubectl logs -n monitoring deployment/elasticsearch
kubectl logs -n monitoring deployment/kibana
```

---

## 📊 6. Key Metrics to Monitor

### Application Health:
- ✅ All pods running (6 total: 3 frontend, 3 backend)
- ✅ No pod restarts
- ✅ CPU usage < 70%
- ✅ Memory usage < 80%
- ✅ Response time < 500ms

### Infrastructure:
- Node CPU usage
- Node memory usage
- Disk I/O
- Network traffic
- Pod scheduling

### Business Metrics (if configured):
- Samples processed per hour
- API request success rate
- Average processing time
- Error rate

---

## 🚀 7. Creating Alerts

### In Grafana:
1. Go to any panel in dashboard
2. Click panel title → Edit
3. Go to "Alert" tab
4. Set conditions (e.g., CPU > 80%)
5. Configure notification channels

### Example Alert Rules:
```yaml
# High CPU Usage
IF avg(cpu_usage) > 80% FOR 5 minutes THEN alert

# Pod Restarts
IF pod_restart_count > 3 IN 10 minutes THEN alert

# Low Available Pods
IF available_pods < 2 THEN alert

# High Error Rate
IF error_rate > 5% FOR 2 minutes THEN alert
```

---

## 📈 8. Custom Dashboard Panels

### Add new panel in Grafana:
1. Click "Add panel"
2. Select visualization type
3. Add Prometheus query
4. Configure display options

### Useful Panel Ideas:
- Request latency histogram
- Error rate by endpoint
- Database query performance
- Cache hit ratio
- Queue length
- Background job status

---

## 🎯 9. Quick Commands

```bash
# Check monitoring namespace
kubectl get all -n monitoring

# Port forward Grafana
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80

# Port forward Prometheus
kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-prometheus 9090:9090

# Port forward Kibana
kubectl port-forward -n monitoring svc/kibana 5601:5601

# Get Grafana password
kubectl get secret -n monitoring monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 -d

# Restart monitoring stack
kubectl rollout restart deployment -n monitoring

# Check metrics endpoint
curl http://192.168.50.100:30080/metrics
```

---

## 📝 10. Interview Talking Points

When demonstrating monitoring:

1. **Observability Stack:**
   - "We use Prometheus for metrics, Grafana for visualization, and ELK for logs"
   - "This provides complete observability into our application"

2. **Proactive Monitoring:**
   - "We monitor both technical and business metrics"
   - "Alerts are configured for critical thresholds"
   - "This allows us to detect issues before users report them"

3. **Debugging Capabilities:**
   - "Centralized logging helps trace issues across microservices"
   - "Metrics correlation helps identify root causes"
   - "Historical data helps identify patterns"

4. **Performance Optimization:**
   - "We track response times and optimize slow endpoints"
   - "Resource monitoring helps right-size our pods"
   - "Cost optimization through usage analysis"

5. **Compliance:**
   - "Audit logs for compliance requirements"
   - "Metrics retention for SLA reporting"
   - "Security event monitoring"

---

## 🔧 Additional Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Kibana Guide](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Kubernetes Monitoring Best Practices](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-usage-monitoring/)

---

**Last Updated**: September 2025  
**Status**: Production Ready  
**Next Steps**: Configure alerting, add custom business metrics, set up log retention policies