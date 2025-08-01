#!/usr/bin/env python3
"""
Backend Testing Suite for Proxilearn Authentication System
Tests backend API endpoints, MongoDB connectivity, and environment configuration
"""

import requests
import json
import os
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://0f73a4da-54f9-4484-a34b-b952ab581164.preview.emergentagent.com"
API_BASE_URL = f"{BASE_URL}/api"

class ProxilearnBackendTester:
    def __init__(self):
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Proxilearn-Backend-Tester/1.0'
        })

    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'details': details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")

    def test_environment_variables(self):
        """Test that environment variables are properly loaded"""
        print("\n=== Testing Environment Variables ===")
        
        try:
            # Read .env file to verify variables exist
            env_file_path = "/app/.env"
            if not os.path.exists(env_file_path):
                self.log_test("Environment File Exists", False, "Environment file not found", 
                            {"path": env_file_path})
                return False

            with open(env_file_path, 'r') as f:
                env_content = f.read()

            required_vars = [
                'NEXT_PUBLIC_BASE_URL',
                'NEXT_PUBLIC_SUPABASE_URL', 
                'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                'MONGO_URL',
                'DB_NAME'
            ]

            missing_vars = []
            for var in required_vars:
                if var not in env_content:
                    missing_vars.append(var)

            if missing_vars:
                self.log_test("Required Environment Variables", False, 
                            f"Missing variables: {', '.join(missing_vars)}")
                return False
            else:
                self.log_test("Required Environment Variables", True, 
                            "All required environment variables found")
                return True

        except Exception as e:
            self.log_test("Environment Variables Loading", False, 
                        f"Error reading environment file: {str(e)}")
            return False

    def test_api_root_endpoint(self):
        """Test the root API endpoint"""
        print("\n=== Testing API Root Endpoint ===")
        
        try:
            # Test /api/root endpoint
            response = self.session.get(f"{API_BASE_URL}/root", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('message') == "Hello World":
                    self.log_test("API Root Endpoint", True, 
                                "Root endpoint responding correctly",
                                {"status_code": response.status_code, "response": data})
                    return True
                else:
                    self.log_test("API Root Endpoint", False, 
                                "Unexpected response format",
                                {"status_code": response.status_code, "response": data})
                    return False
            else:
                self.log_test("API Root Endpoint", False, 
                            f"HTTP {response.status_code}: {response.text}",
                            {"status_code": response.status_code})
                return False

        except requests.exceptions.RequestException as e:
            self.log_test("API Root Endpoint", False, 
                        f"Network error: {str(e)}")
            return False
        except Exception as e:
            self.log_test("API Root Endpoint", False, 
                        f"Unexpected error: {str(e)}")
            return False

    def test_api_status_endpoints(self):
        """Test the status API endpoints (POST and GET)"""
        print("\n=== Testing API Status Endpoints ===")
        
        # Test POST /api/status
        try:
            test_client_name = f"test_client_{uuid.uuid4().hex[:8]}"
            post_data = {"client_name": test_client_name}
            
            response = self.session.post(f"{API_BASE_URL}/status", 
                                       json=post_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get('client_name') == test_client_name and 
                    'id' in data and 'timestamp' in data):
                    self.log_test("API Status POST", True, 
                                "Status POST endpoint working correctly",
                                {"status_code": response.status_code, "created_id": data.get('id')})
                    post_success = True
                    created_id = data.get('id')
                else:
                    self.log_test("API Status POST", False, 
                                "Invalid response format from POST",
                                {"status_code": response.status_code, "response": data})
                    post_success = False
                    created_id = None
            else:
                self.log_test("API Status POST", False, 
                            f"HTTP {response.status_code}: {response.text}",
                            {"status_code": response.status_code})
                post_success = False
                created_id = None

        except Exception as e:
            self.log_test("API Status POST", False, 
                        f"Error testing POST endpoint: {str(e)}")
            post_success = False
            created_id = None

        # Test GET /api/status
        try:
            response = self.session.get(f"{API_BASE_URL}/status", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check if our created record exists (if POST was successful)
                    if post_success and created_id:
                        found_record = any(item.get('id') == created_id for item in data)
                        if found_record:
                            self.log_test("API Status GET", True, 
                                        "Status GET endpoint working and data persisted",
                                        {"status_code": response.status_code, "records_count": len(data)})
                            get_success = True
                        else:
                            self.log_test("API Status GET", False, 
                                        "Created record not found in GET response",
                                        {"status_code": response.status_code, "records_count": len(data)})
                            get_success = False
                    else:
                        self.log_test("API Status GET", True, 
                                    "Status GET endpoint responding with array",
                                    {"status_code": response.status_code, "records_count": len(data)})
                        get_success = True
                else:
                    self.log_test("API Status GET", False, 
                                "GET response is not an array",
                                {"status_code": response.status_code, "response_type": type(data)})
                    get_success = False
            else:
                self.log_test("API Status GET", False, 
                            f"HTTP {response.status_code}: {response.text}",
                            {"status_code": response.status_code})
                get_success = False

        except Exception as e:
            self.log_test("API Status GET", False, 
                        f"Error testing GET endpoint: {str(e)}")
            get_success = False

        return post_success and get_success

    def test_api_error_handling(self):
        """Test API error handling"""
        print("\n=== Testing API Error Handling ===")
        
        try:
            # Test POST without required field
            response = self.session.post(f"{API_BASE_URL}/status", 
                                       json={}, timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and 'client_name is required' in data['error']:
                    self.log_test("API Error Handling", True, 
                                "Proper error handling for missing required fields",
                                {"status_code": response.status_code, "error": data.get('error')})
                    return True
                else:
                    self.log_test("API Error Handling", False, 
                                "Error response format incorrect",
                                {"status_code": response.status_code, "response": data})
                    return False
            else:
                self.log_test("API Error Handling", False, 
                            f"Expected 400 status code, got {response.status_code}",
                            {"status_code": response.status_code})
                return False

        except Exception as e:
            self.log_test("API Error Handling", False, 
                        f"Error testing error handling: {str(e)}")
            return False

    def test_api_not_found(self):
        """Test API 404 handling"""
        print("\n=== Testing API 404 Handling ===")
        
        try:
            response = self.session.get(f"{API_BASE_URL}/nonexistent", timeout=10)
            
            if response.status_code == 404:
                data = response.json()
                if 'error' in data and 'not found' in data['error'].lower():
                    self.log_test("API 404 Handling", True, 
                                "Proper 404 error handling",
                                {"status_code": response.status_code, "error": data.get('error')})
                    return True
                else:
                    self.log_test("API 404 Handling", False, 
                                "404 response format incorrect",
                                {"status_code": response.status_code, "response": data})
                    return False
            else:
                self.log_test("API 404 Handling", False, 
                            f"Expected 404 status code, got {response.status_code}",
                            {"status_code": response.status_code})
                return False

        except Exception as e:
            self.log_test("API 404 Handling", False, 
                        f"Error testing 404 handling: {str(e)}")
            return False

    def test_supabase_client_config(self):
        """Test Supabase client configuration (basic validation)"""
        print("\n=== Testing Supabase Client Configuration ===")
        
        try:
            # Read the supabase.js file to verify configuration
            supabase_file_path = "/app/lib/supabase.js"
            if not os.path.exists(supabase_file_path):
                self.log_test("Supabase Client File", False, "Supabase client file not found",
                            {"path": supabase_file_path})
                return False

            with open(supabase_file_path, 'r') as f:
                supabase_content = f.read()

            # Check for required imports and configuration
            required_elements = [
                'createBrowserClient',
                'NEXT_PUBLIC_SUPABASE_URL',
                'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                'createClient'
            ]

            missing_elements = []
            for element in required_elements:
                if element not in supabase_content:
                    missing_elements.append(element)

            if missing_elements:
                self.log_test("Supabase Client Configuration", False, 
                            f"Missing elements: {', '.join(missing_elements)}")
                return False
            else:
                self.log_test("Supabase Client Configuration", True, 
                            "Supabase client properly configured")
                return True

        except Exception as e:
            self.log_test("Supabase Client Configuration", False, 
                        f"Error checking Supabase configuration: {str(e)}")
            return False

    def test_cors_headers(self):
        """Test CORS headers are properly set"""
        print("\n=== Testing CORS Headers ===")
        
        try:
            response = self.session.get(f"{API_BASE_URL}/root", timeout=10)
            
            cors_headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }

            missing_headers = []
            for header, expected_value in cors_headers.items():
                actual_value = response.headers.get(header)
                if not actual_value:
                    missing_headers.append(header)

            if missing_headers:
                self.log_test("CORS Headers", False, 
                            f"Missing CORS headers: {', '.join(missing_headers)}",
                            {"response_headers": dict(response.headers)})
                return False
            else:
                self.log_test("CORS Headers", True, 
                            "CORS headers properly configured")
                return True

        except Exception as e:
            self.log_test("CORS Headers", False, 
                        f"Error testing CORS headers: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Proxilearn Backend Testing Suite")
        print(f"Testing against: {API_BASE_URL}")
        print("=" * 60)

        # Run all tests
        tests = [
            self.test_environment_variables,
            self.test_supabase_client_config,
            self.test_api_root_endpoint,
            self.test_api_status_endpoints,
            self.test_api_error_handling,
            self.test_api_not_found,
            self.test_cors_headers
        ]

        passed = 0
        failed = 0

        for test in tests:
            try:
                result = test()
                if result:
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL - {test.__name__}: Unexpected error: {str(e)}")
                failed += 1

        # Print summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total: {passed + failed}")
        
        if failed == 0:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {failed} test(s) failed")

        return failed == 0

if __name__ == "__main__":
    tester = ProxilearnBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)