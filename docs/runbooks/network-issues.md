# Network Issues Runbook

## Symptoms

- Services unreachable
- Tailscale disconnected
- DNS resolution failures
- Cross-namespace communication blocked

## Quick Diagnosis

```bash
# Check Tailscale status
tailscale status

# Check cluster networking
kubectl get pods -n kube-system

# Test DNS resolution
kubectl run -it --rm debug --image=busybox -- nslookup kubernetes.default

# Check network policies
kubectl get networkpolicy -A
```

## Common Issues & Fixes

### Issue: Tailscale Connection Failed

**Symptoms**: Can't reach servers via Tailscale IPs

```bash
# Check Tailscale status
tailscale status

# Ping server
tailscale ping 100.89.26.128

# Check Tailscale logs
journalctl -u tailscaled --since "10 minutes ago"
```

**Fixes**:

```bash
# 1. Restart Tailscale
sudo systemctl restart tailscaled

# 2. Re-authenticate
tailscale up --reset

# 3. Check firewall
sudo ufw status
```

### Issue: DNS Resolution Failing

**Symptoms**: `nslookup` or service discovery failing

```bash
# Test CoreDNS
kubectl run -it --rm debug --image=busybox:1.28 -- nslookup lims-backend.production.svc.cluster.local

# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

**Fixes**:

```bash
# 1. Restart CoreDNS
kubectl rollout restart deployment/coredns -n kube-system

# 2. Check CoreDNS configmap
kubectl get configmap coredns -n kube-system -o yaml

# 3. Verify DNS service
kubectl get svc kube-dns -n kube-system
```

### Issue: Service Not Reachable

**Symptoms**: Can't connect to service from another pod

```bash
# Check service exists
kubectl get svc -n production

# Check endpoints
kubectl get endpoints -n production

# Test from another pod
kubectl run -it --rm debug --image=curlimages/curl -- \
  curl -v http://lims-backend.production.svc.cluster.local:3001/health
```

**Fixes**:

```bash
# 1. Verify service selector matches pod labels
kubectl describe svc lims-backend -n production
kubectl get pods -n production --show-labels

# 2. Check if pods are ready
kubectl get pods -n production -l app.kubernetes.io/name=lims-backend

# 3. Test direct pod IP
POD_IP=$(kubectl get pod -n production -l app.kubernetes.io/name=lims-backend -o jsonpath='{.items[0].status.podIP}')
kubectl run -it --rm debug --image=curlimages/curl -- curl http://$POD_IP:3001/health
```

### Issue: Network Policy Blocking Traffic

**Symptoms**: Connection refused/timeout between pods

```bash
# List network policies
kubectl get networkpolicy -n production

# Check policy details
kubectl describe networkpolicy -n production

# Test with network policy disabled (temporarily)
kubectl delete networkpolicy default-deny-all -n production
```

**Debug network policies**:

```bash
# Create a debug pod
kubectl run netshoot --image=nicolaka/netshoot -n production -- sleep 3600

# Test connectivity
kubectl exec -it netshoot -n production -- nc -zv lims-postgresql 5432
kubectl exec -it netshoot -n production -- nc -zv lims-backend 3001

# Cleanup
kubectl delete pod netshoot -n production
```

### Issue: Ingress Not Working

**Symptoms**: External traffic not reaching services

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress -n production

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=100
```

**Fixes**:

```bash
# 1. Verify ingress class
kubectl get ingressclass

# 2. Check TLS certificate
kubectl get secret lims-tls -n production -o yaml

# 3. Test backend directly
kubectl port-forward svc/lims-backend -n production 3001:3001
curl localhost:3001/health
```

### Issue: NodePort Not Accessible

**Symptoms**: Can't reach NodePort from outside cluster

```bash
# Check service type
kubectl get svc -n production

# Check node firewall
ssh server1 "sudo ufw status"
ssh server1 "sudo iptables -L -n | grep 30007"

# Test locally on node
ssh server1 "curl localhost:30007/health"
```

**Fixes**:

```bash
# 1. Open firewall port
ssh server1 "sudo ufw allow 30007/tcp"

# 2. Check kube-proxy
kubectl get pods -n kube-system -l k8s-app=kube-proxy
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=50

# 3. Verify NodePort is in range
kubectl get svc -n production -o yaml | grep nodePort
```

## Network Debugging Tools

### Create debug pod

```bash
kubectl run netshoot --image=nicolaka/netshoot -it --rm -- /bin/bash

# Inside pod:
# Test DNS
nslookup lims-backend.production.svc.cluster.local

# Test TCP connection
nc -zv lims-backend.production.svc.cluster.local 3001

# Trace route
traceroute lims-backend.production.svc.cluster.local

# Capture packets
tcpdump -i any port 3001
```

### Check iptables rules

```bash
# On the node
ssh server1 "sudo iptables -t nat -L KUBE-SERVICES -n"
```

## Escalation

If network issues persist:

1. Check if this is cluster-wide or pod-specific
2. Verify CNI (Container Network Interface) is healthy
3. Check for recent network policy changes
4. Review Kubernetes networking documentation
