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