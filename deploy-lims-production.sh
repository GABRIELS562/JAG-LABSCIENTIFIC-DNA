#!/bin/bash
# LIMS Production Deployment Script
# This script deploys the fixed LIMS application to Kubernetes

echo "========================================="
echo "   LIMS PRODUCTION DEPLOYMENT SCRIPT    "
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Pull latest code
echo -e "${YELLOW}Pulling latest code from GitHub...${NC}"
cd ~/JAG-LABSCIENTIFIC-DNA
git pull

# Build the optimized Docker image
echo -e "${YELLOW}Building optimized Docker image...${NC}"
docker build -f Dockerfile.production-optimized -t localhost:5000/lims-complete:latest .

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker build failed!${NC}"
    exit 1
fi

# Push to local registry
echo -e "${YELLOW}Pushing image to local registry...${NC}"
docker push localhost:5000/lims-complete:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker push failed!${NC}"
    exit 1
fi

# Update the deployment to use local registry
echo -e "${YELLOW}Updating Kubernetes deployment...${NC}"
cat > k8s-production-local.yaml << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: lims-complete-service
  namespace: production
spec:
  selector:
    app: lims-complete
  ports:
    - protocol: TCP
      port: 3001
      targetPort: 3001
      nodePort: 30007
  type: NodePort
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lims-complete
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lims-complete
  template:
    metadata:
      labels:
        app: lims-complete
    spec:
      containers:
      - name: lims-complete
        image: localhost:5000/lims-complete:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3001"
        - name: SERVE_STATIC
          value: "true"
        - name: VITE_API_URL
          value: ""
        - name: DB_HOST
          value: "postgres-service"
        - name: DB_PORT
          value: "5432"
        - name: DB_USER
          value: "lims_user"
        - name: DB_PASSWORD
          value: "lims2024secure"
        - name: DB_NAME
          value: "limsdb"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/test
            port: 3001
          initialDelaySeconds: 120
          periodSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/test
            port: 3001
          initialDelaySeconds: 90
          periodSeconds: 5
          failureThreshold: 3
EOF

# Apply the configuration
kubectl apply -f k8s-production-local.yaml

# Delete old pods to force recreation
echo -e "${YELLOW}Deleting old pods...${NC}"
kubectl delete pods -l app=lims-complete -n production

# Wait for rollout
echo -e "${YELLOW}Waiting for deployment to complete...${NC}"
kubectl rollout status deployment/lims-complete -n production --timeout=300s

# Check pod status
echo -e "${GREEN}Checking pod status...${NC}"
kubectl get pods -n production | grep lims

# Get pod name
POD_NAME=$(kubectl get pods -n production -l app=lims-complete -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
    echo -e "${RED}No pod found!${NC}"
    exit 1
fi

# Show logs
echo -e "${GREEN}Showing pod logs...${NC}"
kubectl logs $POD_NAME -n production --tail=20

# Test the application
echo -e "${GREEN}Testing application endpoints...${NC}"
echo "Waiting 10 seconds for service to be ready..."
sleep 10

# Test internal pod access
echo -e "${YELLOW}Testing internal pod access...${NC}"
kubectl exec $POD_NAME -n production -- wget -qO- localhost:3001/api/test | head -5 || echo "wget not available"

# Test service
echo -e "${YELLOW}Testing service endpoint...${NC}"
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
curl -s http://${NODE_IP}:30007/api/test | jq . || echo "Service not ready yet"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   DEPLOYMENT COMPLETE!                 ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Access the application at:"
echo "  - Internal: http://${NODE_IP}:30007"
echo "  - External: https://lims.jagdevops.co.za (if ingress is configured)"
echo ""
echo "Check status with:"
echo "  kubectl get pods -n production"
echo "  kubectl logs $POD_NAME -n production"
echo ""