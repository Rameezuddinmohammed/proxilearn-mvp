#!/usr/bin/env python3
"""
Simple test to debug the API connectivity issue
"""

import requests
import json

def test_single_endpoint():
    url = "http://localhost:3000/api/subjects"
    print(f"Testing: {url}")
    
    try:
        response = requests.get(url, timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return response
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    test_single_endpoint()