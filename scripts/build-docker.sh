#!/bin/bash

# LIMS Docker Build Script for K3s Deployment
# Part of the unified portfolio - Server 1 (Production Apps)

set -e

echo "🔬 Building LIMS Docker Images for K3s Deployment"
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="lims-backend"
TAG="${1:-latest}"
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

# Build timestamp for FDA compliance tracking
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BUILD_ID=$(date +%s)

echo -e "${BLUE}Build Configuration:${NC}"
echo "  Image Name: ${FULL_IMAGE_NAME}"
echo "  Build Timestamp: ${BUILD_TIMESTAMP}"
echo "  Build ID: ${BUILD_ID}"
echo "  FDA Compliance: Enabled"
echo ""

# Pre-build checks
echo -e "${YELLOW}Running pre-build checks...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ Dockerfile not found in current directory.${NC}"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Are you in the LIMS project root?${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-build checks passed${NC}"
echo ""

# Build the image with FDA compliance labels
echo -e "${YELLOW}Building Docker image...${NC}"
docker build \
    --tag "${FULL_IMAGE_NAME}" \
    --label "compliance.fda.21cfr-part11=true" \
    --label "build.timestamp=${BUILD_TIMESTAMP}" \
    --label "build.id=${BUILD_ID}" \
    --label "project=lims-dna-scientific" \
    --label "tier=production" \
    --label "portfolio.server=server1" \
    --label "monitoring.prometheus.enabled=true" \
    --label "monitoring.prometheus.port=9101" \
    --build-arg BUILD_TIMESTAMP="${BUILD_TIMESTAMP}" \
    --build-arg BUILD_ID="${BUILD_ID}" \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully: ${FULL_IMAGE_NAME}${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Verify the image
echo -e "${YELLOW}Verifying image...${NC}"
docker inspect "${FULL_IMAGE_NAME}" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Image verification passed${NC}"
    
    # Display image information
    echo ""
    echo -e "${BLUE}Image Information:${NC}"
    docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    
    echo ""
    echo -e "${BLUE}FDA Compliance Labels:${NC}"
    docker inspect "${FULL_IMAGE_NAME}" --format '{{range $key, $value := .Config.Labels}}{{$key}}: {{$value}}{{"\n"}}{{end}}' | grep -E "(compliance|build|project|tier|monitoring)"
    
else
    echo -e "${RED}❌ Image verification failed${NC}"
    exit 1
fi

# Check if we should push to local registry (for K3s)
if [ "${2}" = "push" ]; then
    echo ""
    echo -e "${YELLOW}Pushing to local K3s registry...${NC}"
    
    # Tag for local registry
    LOCAL_TAG="localhost:5000/${FULL_IMAGE_NAME}"
    docker tag "${FULL_IMAGE_NAME}" "${LOCAL_TAG}"
    
    # Push to local registry
    docker push "${LOCAL_TAG}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Image pushed to local registry: ${LOCAL_TAG}${NC}"
    else
        echo -e "${RED}❌ Failed to push to local registry${NC}"
        exit 1
    fi
fi

# Generate build report for FDA compliance
BUILD_REPORT="build-report-${BUILD_ID}.json"
cat > "${BUILD_REPORT}" << EOF
{
  "buildId": "${BUILD_ID}",
  "timestamp": "${BUILD_TIMESTAMP}",
  "image": "${FULL_IMAGE_NAME}",
  "compliance": {
    "fda21CfrPart11": true,
    "auditTrailEnabled": true,
    "buildTraceability": true
  },
  "labels": {
    "compliance.fda.21cfr-part11": "true",
    "build.timestamp": "${BUILD_TIMESTAMP}",
    "build.id": "${BUILD_ID}",
    "project": "lims-dna-scientific",
    "tier": "production",
    "portfolio.server": "server1",
    "monitoring.prometheus.enabled": "true",
    "monitoring.prometheus.port": "9101"
  },
  "artifacts": {
    "dockerfile": "Dockerfile",
    "buildScript": "scripts/build-docker.sh",
    "k8sManifests": "k3s/*.yaml"
  }
}
EOF

echo ""
echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo -e "${BLUE}Build report saved: ${BUILD_REPORT}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Deploy to K3s: ./scripts/deploy-k3s.sh"
echo "2. Verify deployment: kubectl get pods -n lims-production"
echo "3. Check metrics: curl http://localhost:9101/metrics"
echo ""
echo -e "${BLUE}📊 Portfolio Integration:${NC}"
echo "  ✓ FDA-compliant LIMS (Server 1)"
echo "  ✓ Prometheus metrics on port 9101"
echo "  ✓ Ready for forensic monitoring"
echo "  → Next: Deploy to K3s cluster"