#!/usr/bin/env python3
"""
FocusFlow - The Watcher
Desktop app detection script that monitors for gaming/distraction apps
and sends heartbeats to the FocusFlow API.

Usage:
    python watcher.py [--token YOUR_JWT_TOKEN] [--api http://localhost:5000]

Requirements:
    pip install psutil requests
"""

import os
import sys
import time
import argparse
from datetime import datetime

try:
    import psutil
    import requests
except ImportError:
    print("ERROR: Required packages not installed.")
    print("Run: pip install psutil requests")
    sys.exit(1)

# Apps to watch for (process name substrings)
WATCHED_APPS = [
    'Roblox',
    'ClubWPT Gold',
    'Discord',
    'Code',      # VS Code - for testing
    'Chrome',    # Chrome - for testing
    'Notepad',   # Notepad - for testing
]

# Alternative process names to check
PROCESS_PATTERNS = {
    'Roblox': ['roblox', 'robloxplayerbeta', 'robloxstudiobeta'],
    'ClubWPT Gold': ['clubwpt', 'wpt'],
    'Discord': ['discord'],
    'Code': ['code'],           # VS Code
    'Chrome': ['chrome'],       # Google Chrome
    'Notepad': ['notepad'],     # Notepad
}

# Configuration
DEFAULT_API_URL = 'http://localhost:5000'
CHECK_INTERVAL = 60  # seconds


def get_running_processes():
    """Get list of all running process names (lowercase)"""
    processes = []
    for proc in psutil.process_iter(['name']):
        try:
            name = proc.info['name']
            if name:
                processes.append(name.lower())
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return processes


def detect_watched_apps(processes):
    """Check if any watched apps are running"""
    detected = []
    
    for app_name, patterns in PROCESS_PATTERNS.items():
        for pattern in patterns:
            for proc in processes:
                if pattern.lower() in proc:
                    if app_name not in detected:
                        detected.append(app_name)
                    break
    
    return detected


def send_heartbeat(api_url, token, app_detected):
    """Send heartbeat to FocusFlow API"""
    url = f"{api_url}/api/intervention/heartbeat"
    headers = {
        'Content-Type': 'application/json',
    }
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        response = requests.post(
            url,
            json={'app_detected': app_detected},
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"[ERROR] API returned status {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Failed to send heartbeat: {e}")
        return None


def print_status(detected_apps, api_response):
    """Print current status to console"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    
    if detected_apps:
        print(f"[{timestamp}] ⚠️  DETECTED: {', '.join(detected_apps)}")
        
        if api_response:
            status = api_response.get('status', 'UNKNOWN')
            minutes = api_response.get('gaming_minutes', 0)
            allowance = api_response.get('allowance', 60)
            message = api_response.get('message', '')
            
            status_emoji = {
                'OK': '🟢',
                'WARNING': '🟡',
                'CRITICAL': '🔴'
            }.get(status, '⚪')
            
            print(f"         {status_emoji} Status: {status} | {minutes}/{allowance} min | {message}")
    else:
        print(f"[{timestamp}] ✅ All clear - no watched apps detected")


def main():
    parser = argparse.ArgumentParser(description='FocusFlow Watcher - App Detection')
    parser.add_argument('--token', '-t', help='JWT auth token')
    parser.add_argument('--api', '-a', default=DEFAULT_API_URL, help='API base URL')
    parser.add_argument('--interval', '-i', type=int, default=CHECK_INTERVAL, help='Check interval in seconds')
    parser.add_argument('--once', action='store_true', help='Run once and exit')
    args = parser.parse_args()
    
    # Try to get token from environment if not provided
    token = args.token or os.getenv('FOCUSFLOW_TOKEN')
    
    print("=" * 50)
    print("🦉 FocusFlow Watcher Started")
    print("=" * 50)
    print(f"API: {args.api}")
    print(f"Interval: {args.interval}s")
    print(f"Auth: {'✓ Token provided' if token else '✗ No token (using demo user)'}")
    print(f"Watching for: {', '.join(WATCHED_APPS)}")
    print("=" * 50)
    print()
    
    while True:
        try:
            # Get running processes
            processes = get_running_processes()
            
            # Check for watched apps
            detected = detect_watched_apps(processes)
            
            # Send heartbeat if apps detected
            api_response = None
            if detected:
                # Send for first detected app
                api_response = send_heartbeat(args.api, token, detected[0])
            
            # Print status
            print_status(detected, api_response)
            
            if args.once:
                break
            
            # Wait for next check
            time.sleep(args.interval)
            
        except KeyboardInterrupt:
            print("\n\n👋 Watcher stopped by user")
            break
        except Exception as e:
            print(f"[ERROR] Unexpected error: {e}")
            if args.once:
                break
            time.sleep(args.interval)


if __name__ == '__main__':
    main()
