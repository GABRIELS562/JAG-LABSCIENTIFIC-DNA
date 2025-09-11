#!/bin/bash

# Build script for LIMS Docker image

set -e  # Exit on error

# Configuration
IMAGE_NAME="lims-complete"
TAG="latest"
REGISTRY="localhost:5000"
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "========================================="
echo "Building LIMS Docker Image"
echo "========================================="
echo ""

# Step 1: Build the Docker image
echo "Step 1: Building Docker image..."
docker build -t ${IMAGE_NAME}:${TAG} .
if [ $? -eq 0 ]; then
    echo "✓ Docker image built successfully"
else
    echo "✗ Docker build failed"
    exit 1
fi

# Step 2: Tag the image for local registry
echo ""
echo "Step 2: Tagging image for local registry..."
docker tag ${IMAGE_NAME}:${TAG} ${FULL_IMAGE_NAME}
if [ $? -eq 0 ]; then
    echo "✓ Image tagged as ${FULL_IMAGE_NAME}"
else
    echo "✗ Tagging failed"
    exit 1
fi

# Step 3: Push to local registry (optional - will fail if registry not running)
echo ""
echo "Step 3: Pushing to local registry..."
docker push ${FULL_IMAGE_NAME} 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Image pushed to ${REGISTRY}"
else
    echo "⚠ Could not push to registry (is it running?)"
    echo "  To run a local registry:"
    echo "  docker run -d -p 5000:5000 --name registry registry:2"
fi

echo ""
echo "========================================="
echo "Build Complete!"
echo "========================================="
echo ""
echo "Image available as:"
echo "  - ${IMAGE_NAME}:${TAG}"
echo "  - ${FULL_IMAGE_NAME}"
echo ""
echo "To run the container:"
echo "  docker run -p 3000:3000 -p 3001:3001 ${IMAGE_NAME}:${TAG}"
echo ""
echo "To run with environment variables:"
echo "  docker run -p 3000:3000 -p 3001:3001 -e NODE_ENV=production ${IMAGE_NAME}:${TAG}"
echo ""