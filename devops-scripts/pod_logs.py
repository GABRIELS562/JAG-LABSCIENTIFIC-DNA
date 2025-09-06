#!/usr/bin/env python3
"""
This script gets logs from Kubernetes pods
Like running: kubectl logs pod-name
"""

import subprocess
import sys

def get_pod_logs(pod_name, lines=50):
    """
    Get last 50 lines of logs from a pod
    """
    cmd = f"kubectl logs {pod_name} --tail={lines}"
    
    try:
        result = subprocess.run(
            cmd.split(),
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print(f"\n📜 Last {lines} lines from {pod_name}:")
            print("=" * 60)
            print(result.stdout)
            print("=" * 60)
        else:
            print(f"❌ Error: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Failed to get logs: {e}")

def list_pods():
    """
    Show all pods so user can pick one
    """
    cmd = "kubectl get pods --all-namespaces"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    print("\n📦 Available pods:")
    print(result.stdout)

# Main program
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 pod_logs.py list         # Show all pods")
        print("  python3 pod_logs.py <pod-name>   # Get logs from pod")
        sys.exit(1)
    
    if sys.argv[1] == "list":
        list_pods()
    else:
        pod_name = sys.argv[1]
        get_pod_logs(pod_name)