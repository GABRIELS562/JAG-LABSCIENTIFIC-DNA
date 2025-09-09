#!/bin/bash

# JAG DNA Scientific LIMS - Production Build Script
# This script builds the Docker image for production deployment

set -e  # Exit on error

echo "================================================"
echo "JAG DNA Scientific LIMS - Production Build"
echo "================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="jag-lims"
IMAGE_TAG="production"
DOCKERFILE="Dockerfile.production"
BUILD_TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Dockerfile exists
if [ ! -f "$DOCKERFILE" ]; then
    print_error "$DOCKERFILE not found!"
    exit 1
fi

print_info "Starting production build..."

# Clean up any existing containers using the image
print_info "Cleaning up existing containers..."
docker ps -a | grep $IMAGE_NAME | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

# Build the Docker image
print_info "Building Docker image..."
docker build \
    -f $DOCKERFILE \
    -t $IMAGE_NAME:$IMAGE_TAG \
    -t $IMAGE_NAME:$BUILD_TIMESTAMP \
    -t $IMAGE_NAME:latest \
    --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
    --build-arg VERSION=$BUILD_TIMESTAMP \
    .

if [ $? -eq 0 ]; then
    print_success "Docker image built successfully!"
    echo ""
    echo "Image tags created:"
    echo "  - $IMAGE_NAME:$IMAGE_TAG"
    echo "  - $IMAGE_NAME:$BUILD_TIMESTAMP"
    echo "  - $IMAGE_NAME:latest"
else
    print_error "Docker build failed!"
    exit 1
fi

# Show image size
print_info "Image details:"
docker images | grep $IMAGE_NAME | head -3

# Optional: Run security scan
if command -v trivy &> /dev/null; then
    print_info "Running security scan with Trivy..."
    trivy image --severity HIGH,CRITICAL $IMAGE_NAME:$IMAGE_TAG
fi

# Create a build info file
print_info "Creating build info..."
cat > build-info.json <<EOF
{
  "image": "$IMAGE_NAME:$IMAGE_TAG",
  "timestamp": "$BUILD_TIMESTAMP",
  "date": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "builder": "$(whoami)@$(hostname)"
}
EOF

print_success "Build info saved to build-info.json"

echo ""
echo "================================================"
echo "Build completed successfully!"
echo "================================================"
echo ""
echo "To run the container locally:"
echo "  docker run -p 3001:3001 $IMAGE_NAME:$IMAGE_TAG"
echo ""
echo "To use with docker-compose:"
echo "  docker-compose -f docker-compose.production.yml up"
echo ""
echo "To push to registry:"
echo "  docker tag $IMAGE_NAME:$IMAGE_TAG <registry>/$IMAGE_NAME:$IMAGE_TAG"
echo "  docker push <registry>/$IMAGE_NAME:$IMAGE_TAG"
echo ""