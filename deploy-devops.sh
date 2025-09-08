#!/bin/bash

# LIMS DevOps Deployment Script
# Ready for K3s showcase with continuous monitoring

set -e

echo "🚀 JAG LIMS DevOps Deployment Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found. Please install K3s first.${NC}"
    exit 1
fi

# Build Docker image
echo -e "${YELLOW}📦 Building Docker image...${NC}"
docker build -f Dockerfile.production -t jagdna-lims:production . || {
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Apply K8s manifests
echo -e "${YELLOW}☸️  Deploying PostgreSQL...${NC}"
kubectl apply -f k8s/postgresql-deployment.yaml

echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgres -n lims-production --timeout=120s || {
    echo -e "${YELLOW}⚠️  PostgreSQL taking longer than expected. Checking status...${NC}"
    kubectl get pods -l app=postgres -n lims-production
}

echo -e "${YELLOW}☸️  Deploying LIMS Application...${NC}"
kubectl apply -f k8s/lims-devops-deployment.yaml

# Wait for deployment
echo -e "${YELLOW}⏳ Waiting for pods to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=lims -n lims-production --timeout=120s || {
    echo -e "${YELLOW}⚠️  Pods taking longer than expected. Checking status...${NC}"
    kubectl get pods -n lims-production
}

# Get pod status
echo -e "${GREEN}📊 Deployment Status:${NC}"
kubectl get pods -n lims-production
kubectl get svc -n lims-production

# Show access URLs
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "Access your LIMS application:"
echo -e "${GREEN}📱 Application:${NC} http://${NODE_IP}:30080"
echo -e "${GREEN}📊 Health Check:${NC} http://${NODE_IP}:30080/health"
echo -e "${GREEN}📈 Prometheus Metrics:${NC} http://${NODE_IP}:30090/metrics"
echo ""
echo "Monitor with:"
echo "  kubectl logs -f -n lims-production -l app=lims"
echo "  kubectl top pods -n lims-production"
echo ""
echo -e "${YELLOW}💡 Tip: The sample generator will start creating data automatically for monitoring${NC}"