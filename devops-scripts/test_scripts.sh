#!/bin/bash
# Test script for Python automation tools

echo "🧪 Testing Python Automation Scripts"
echo "====================================="

# Test 1: List deployments
echo -e "\n📋 Test 1: Listing all deployments..."
python3 simple_deploy.py list

# Test 2: Single health check
echo -e "\n🏥 Test 2: Single health check..."
python3 health_check.py

# Test 3: List all pods
echo -e "\n📦 Test 3: Listing all pods..."
python3 pod_logs.py list

echo -e "\n✅ All basic tests completed!"
echo -e "\nAdditional commands you can try:"
echo "  python3 simple_deploy.py scale lims-backend 3"
echo "  python3 health_check.py monitor"
echo "  python3 pod_logs.py <pod-name>"