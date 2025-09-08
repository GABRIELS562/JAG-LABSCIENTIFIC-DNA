#!/bin/bash

echo "==========================================="
echo "     JAGDNA LIMS Portfolio Status"
echo "==========================================="
echo

echo "📊 KUBERNETES CLUSTER STATUS"
echo "-------------------------------------------"
kubectl get nodes -o wide

echo
echo "🚀 PRODUCTION ENVIRONMENT"
echo "-------------------------------------------"
kubectl get all -n production

echo
echo "🌐 SERVICE ENDPOINTS"
echo "-------------------------------------------"
kubectl get endpoints -n production

echo
echo "💾 PERSISTENT VOLUMES"
echo "-------------------------------------------"
kubectl get pv,pvc -n production

echo
echo "🎯 ACCESS URLS"
echo "-------------------------------------------"
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo "Frontend: http://$NODE_IP:30080"
echo "Backend API: Internal (ClusterIP)"

echo
echo "✅ APPLICATION STATUS"
echo "-------------------------------------------"
curl -s http://$NODE_IP:30080/api/health | jq -r '.data.status' 2>/dev/null || echo "API Status: Check manually"

echo
echo "==========================================="