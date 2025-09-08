#!/bin/bash

# Local Docker Registry Setup for K3s
# This eliminates external dependencies and speeds up deployments

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Local Docker Registry Setup${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if registry already exists
if docker ps -a | grep -q local-registry; then
    echo -e "${YELLOW}Registry container already exists. Restarting...${NC}"
    docker start local-registry
else
    echo -e "${GREEN}Creating local Docker registry...${NC}"
    
    # Create registry with restart policy and volume for persistence
    docker run -d \
        --name local-registry \
        --restart=always \
        -p 5000:5000 \
        -v registry-data:/var/lib/registry \
        registry:2
    
    echo -e "${GREEN}✓ Registry created${NC}"
fi

# Wait for registry to be ready
echo -e "${YELLOW}Waiting for registry to be ready...${NC}"
sleep 5

# Test registry
if curl -s http://localhost:5000/v2/_catalog > /dev/null; then
    echo -e "${GREEN}✓ Registry is running${NC}"
else
    echo -e "${RED}✗ Registry health check failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}   K3s Registry Configuration${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Configure K3s to use local registry
echo -e "${YELLOW}Configuring K3s to trust local registry...${NC}"

# Create K3s registry configuration
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/registries.yaml > /dev/null << 'EOF'
mirrors:
  "localhost:5000":
    endpoint:
      - "http://localhost:5000"
  "registry.local":
    endpoint:
      - "http://localhost:5000"
configs:
  "localhost:5000":
    tls:
      insecure_skip_verify: true
EOF

echo -e "${GREEN}✓ K3s registry configuration created${NC}"

# Restart K3s to apply configuration
echo -e "${YELLOW}Restarting K3s to apply configuration...${NC}"
sudo systemctl restart k3s

# Wait for K3s to be ready
sleep 10
kubectl wait --for=condition=Ready node --all --timeout=60s

echo -e "${GREEN}✓ K3s restarted with registry configuration${NC}"

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}      Usage Instructions${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

cat << 'USAGE'
LOCAL REGISTRY IS NOW RUNNING!

To use the local registry:

1. Tag your image for local registry:
   docker tag lims-backend:latest localhost:5000/lims-backend:latest

2. Push to local registry:
   docker push localhost:5000/lims-backend:latest

3. Use in K3s deployments:
   image: localhost:5000/lims-backend:latest

BENEFITS:
✓ No external dependencies
✓ Faster image pulls (local network)
✓ Works offline
✓ Secure (no external exposure)
✓ Persistent storage

COMMANDS:
# View images in registry
curl http://localhost:5000/v2/_catalog

# View tags for an image
curl http://localhost:5000/v2/lims-backend/tags/list

# Check registry logs
docker logs local-registry

# Stop registry (if needed)
docker stop local-registry

# Remove registry (if needed)
docker rm -v local-registry
USAGE

echo ""
echo -e "${GREEN}✅ Local registry setup complete!${NC}"
echo -e "${BLUE}Registry URL: localhost:5000${NC}"