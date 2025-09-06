#!/usr/bin/env python3
"""
This script automates Kubernetes deployments
Instead of typing: kubectl scale deployment/app --replicas=3
We can type: python3 simple_deploy.py scale app 3
"""

import subprocess  # This lets Python run terminal commands
import json       # This helps read Kubernetes data
import sys        # This gets command line arguments

def run_kubectl(command):
    """
    This function runs any kubectl command and returns the output
    Example: run_kubectl("kubectl get pods") 
    """
    try:
        # Split the command into words and run it
        result = subprocess.run(
            command.split(),        # Turn "kubectl get pods" into ["kubectl", "get", "pods"]
            capture_output=True,    # Capture what the command prints
            text=True,             # Get output as text, not bytes
            check=True             # Stop if command fails
        )
        return result.stdout       # Return the command output
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {e.stderr}")
        return None

def list_deployments(namespace="default"):
    """
    Shows all deployments and how many pods are ready
    Like running: kubectl get deployments
    """
    print(f"\n📋 Deployments in {namespace}:")
    
    # Get deployment info as JSON
    cmd = f"kubectl get deployments -n {namespace} -o json"
    output = run_kubectl(cmd)
    
    if output:
        data = json.loads(output)  # Convert JSON text to Python dictionary
        
        # Loop through each deployment
        for deployment in data['items']:
            name = deployment['metadata']['name']
            desired = deployment['spec']['replicas']
            ready = deployment['status'].get('readyReplicas', 0)
            
            # Show status with emoji
            if ready == desired:
                print(f"  ✅ {name}: {ready}/{desired} pods ready")
            else:
                print(f"  ⚠️  {name}: {ready}/{desired} pods ready")

def scale_deployment(name, replicas, namespace="default"):
    """
    Changes the number of pods in a deployment
    Like running: kubectl scale deployment/name --replicas=3
    """
    print(f"\n🔄 Scaling {name} to {replicas} pods...")
    
    cmd = f"kubectl scale deployment/{name} --replicas={replicas} -n {namespace}"
    
    if run_kubectl(cmd):
        print(f"✅ Successfully scaled {name} to {replicas} replicas")
    else:
        print(f"❌ Failed to scale {name}")

if __name__ == "__main__":
    # Check if user provided arguments
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 simple_deploy.py list")
        print("  python3 simple_deploy.py scale <name> <replicas>")
        sys.exit(1)
    
    action = sys.argv[1]  # First argument (list or scale)
    
    if action == "list":
        # List all deployments in key namespaces
        for ns in ["default", "development", "staging", "production"]:
            list_deployments(ns)
    
    elif action == "scale" and len(sys.argv) == 4:
        name = sys.argv[2]      # Deployment name
        replicas = int(sys.argv[3])  # Number of replicas
        scale_deployment(name, replicas)
    
    else:
        print("❌ Invalid command")