# 📘 Day 2: Python Automation - Clear Step-by-Step Guide

## 🎯 What We're Building
A Python script that automates Kubernetes tasks instead of typing kubectl commands manually.

---

## 📝 PART 1: Create Simple Deployment Script

### Step 1: Create the Python file
```bash
cd ~
mkdir devops-scripts
cd devops-scripts
vi simple_deploy.py
```

### Step 2: Add Basic Imports (press 'i' to insert in vi)
```python
#!/usr/bin/env python3
"""
This script automates Kubernetes deployments
Instead of typing: kubectl scale deployment/app --replicas=3
We can type: python3 simple_deploy.py scale app 3
"""

import subprocess  # This lets Python run terminal commands
import json       # This helps read Kubernetes data
import sys        # This gets command line arguments
```

**What this code does:**
- `subprocess` = Runs kubectl commands from Python
- `json` = Reads the JSON data that kubectl returns
- `sys` = Gets what you type after `python3 simple_deploy.py`

### Step 3: Add Function to Run kubectl Commands
```python
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
```

**What this does:**
1. Takes a kubectl command as text
2. Runs it in terminal
3. Returns what the command printed
4. If it fails, prints the error

### Step 4: Add Function to List Deployments
```python
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
```

**What this does:**
1. Runs `kubectl get deployments` 
2. Gets the output as JSON
3. Reads each deployment's name and pod count
4. Shows ✅ if all pods ready, ⚠️ if not

### Step 5: Add Function to Scale Deployments
```python
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
```

**What this does:**
1. Takes deployment name and desired pod count
2. Runs kubectl scale command
3. Shows success or failure message

### Step 6: Add Main Program Logic
```python
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
```

**What this does:**
1. Checks what command you typed
2. If "list" - shows all deployments
3. If "scale" - scales the deployment
4. If wrong - shows error

### Step 7: Save and Exit vi
Press `Esc`, then type `:wq` and press Enter

### Step 8: Test Your Script
```bash
# Make it executable
chmod +x simple_deploy.py

# Test listing deployments
python3 simple_deploy.py list

# Test scaling
python3 simple_deploy.py scale lims-backend 3
```

---

## 📝 PART 2: Create Health Check Script

### Step 1: Create New File
```bash
vi health_check.py
```

### Step 2: Add the Code (press 'i' first)
```python
#!/usr/bin/env python3
"""
This script checks if your services are healthy
Like running: curl http://localhost:31397/health
"""

import requests  # For making HTTP requests (install with: pip3 install requests)
import time     # For delays between checks
import sys      # For command line arguments

def check_service_health(url):
    """
    Checks if a service is responding
    Returns True if healthy, False if not
    """
    try:
        # Try to connect to the service
        response = requests.get(f"{url}/health", timeout=5)
        
        if response.status_code == 200:
            print(f"✅ {url} is healthy")
            return True
        else:
            print(f"❌ {url} returned error code: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"⏱️ {url} timeout - took too long to respond")
        return False
        
    except requests.exceptions.ConnectionError:
        print(f"🔌 {url} connection failed - service might be down")
        return False
        
    except Exception as e:
        print(f"❓ {url} unexpected error: {e}")
        return False

def monitor_continuously(url, interval=30):
    """
    Check health every 30 seconds forever
    Press Ctrl+C to stop
    """
    print(f"📍 Monitoring {url} every {interval} seconds")
    print("Press Ctrl+C to stop\n")
    
    check_count = 0
    success_count = 0
    
    try:
        while True:
            check_count += 1
            
            # Check health
            if check_service_health(url):
                success_count += 1
            
            # Calculate uptime percentage
            uptime = (success_count / check_count) * 100
            print(f"📊 Uptime: {uptime:.1f}% ({success_count}/{check_count} checks)")
            print("-" * 50)
            
            # Wait before next check
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\n\n🛑 Monitoring stopped")
        print(f"Final uptime: {uptime:.1f}%")

# Main program
if __name__ == "__main__":
    # Your service URL (change this to match your NodePort)
    SERVICE_URL = "http://localhost:31397"
    
    if len(sys.argv) > 1 and sys.argv[1] == "monitor":
        # Continuous monitoring mode
        monitor_continuously(SERVICE_URL)
    else:
        # Single check
        check_service_health(SERVICE_URL)
```

### Step 3: Save and Test
```bash
# Save in vi (Esc, :wq)

# Install requests library if needed
pip3 install requests

# Single health check
python3 health_check.py

# Continuous monitoring
python3 health_check.py monitor
```

---

## 📝 PART 3: Create Log Viewer Script

### Step 1: Create File
```bash
vi pod_logs.py
```

### Step 2: Add Code
```python
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
```

### Step 3: Test It
```bash
# List all pods
python3 pod_logs.py list

# Get logs from specific pod
python3 pod_logs.py lims-backend-558bbd55f-w9tgr
```

---

## 📊 Summary: What You Built

### Three Simple Scripts:

1. **simple_deploy.py** - Manage deployments
   - Lists all deployments with status
   - Scales deployments up or down

2. **health_check.py** - Monitor services
   - Checks if service is responding
   - Continuous monitoring with uptime stats

3. **pod_logs.py** - View logs
   - Lists all pods
   - Shows logs from specific pods

### Why This Is Useful:

**Without Python:**
```bash
kubectl get deployments -n default -o json | grep replicas
kubectl scale deployment/lims-backend --replicas=3
curl http://localhost:31397/health
kubectl logs pod-name --tail=50
```

**With Python:**
```bash
python3 simple_deploy.py list
python3 simple_deploy.py scale lims-backend 3
python3 health_check.py monitor
python3 pod_logs.py lims-backend-xyz
```

### Key Learning Points:

1. **subprocess.run()** - Runs terminal commands from Python
2. **json.loads()** - Converts JSON text to Python dictionaries
3. **sys.argv** - Gets command line arguments
4. **try/except** - Handles errors gracefully
5. **requests.get()** - Makes HTTP requests to services

---

## 🎯 Next Steps

Once these work, you can:
1. Add more features (restart deployments, create new ones)
2. Add error handling (what if deployment doesn't exist?)
3. Add logging to files (keep history of actions)
4. Create a menu-driven interface
5. Add color to output (using colorama library)

But start with these simple scripts first - they do real, useful work!