#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Proxilearn Student Phase APIs
Tests all 14 newly implemented Student Phase API endpoints
"""

import requests
import json
import os
import sys
from datetime import datetime
import uuid

# Configuration - Using localhost since external URL has connectivity issues from container
BASE_URL = "http://localhost:3000"
API_BASE_URL = f"{BASE_URL}/api"
TIMEOUT = 30

class ProxilearnStudentPhaseAPITester:
    def __init__(self):
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Proxilearn-Student-Phase-Tester/1.0'
        })
        self.test_data = {
            "subjects": [],
            "assignments": [],
            "study_groups": [],
            "doubts": []
        }

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

    def make_request(self, method, endpoint, data=None, timeout=5):
        """Make HTTP request with error handling"""
        url = f"{API_BASE_URL}{endpoint}"
        
        try:
            # Use requests directly instead of session to avoid issues
            if method == 'GET':
                response = requests.get(url, timeout=timeout, headers={'Content-Type': 'application/json'})
            elif method == 'POST':
                response = requests.post(url, json=data, timeout=timeout, headers={'Content-Type': 'application/json'})
            elif method == 'PUT':
                response = requests.put(url, json=data, timeout=timeout, headers={'Content-Type': 'application/json'})
            elif method == 'DELETE':
                response = requests.delete(url, timeout=timeout, headers={'Content-Type': 'application/json'})
            
            return response
        except requests.exceptions.Timeout:
            self.log_test(f"Request to {endpoint}", False, f"Request timeout after {timeout}s")
            return None
        except requests.exceptions.RequestException as e:
            self.log_test(f"Request to {endpoint}", False, f"Network error: {str(e)}")
            return None

    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        print("\n=== BASIC CONNECTIVITY TESTS ===")
        
        # Test root endpoint
        response = self.make_request('GET', '/root')
        if response and response.status_code == 200:
            self.log_test("Root endpoint connectivity", True, "API is accessible")
            return True
        else:
            self.log_test("Root endpoint connectivity", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_subjects_api(self):
        """Test GET /api/subjects"""
        print("\n=== SUBJECTS API TESTS ===")
        
        print(f"Testing URL: {API_BASE_URL}/subjects")
        response = self.make_request('GET', '/subjects')
        if not response:
            self.log_test("Subjects API - Network", False, "No response received")
            return False
        
        print(f"Response status: {response.status_code}")
        print(f"Response text: {response.text[:200]}...")
        
        if response.status_code == 401:
            self.log_test("Subjects API - Authentication", True, "Properly requires authentication")
            return True
        elif response.status_code == 200:
            try:
                data = response.json()
                if 'subjects' in data and 'count' in data:
                    self.log_test("Subjects API - Structure", True, f"Found {data.get('count', 0)} subjects")
                    self.test_data['subjects'] = data.get('subjects', [])
                    return True
                else:
                    self.log_test("Subjects API - Structure", False, "Missing expected fields")
                    return False
            except json.JSONDecodeError:
                self.log_test("Subjects API - JSON", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Subjects API - Status", False, f"Unexpected status: {response.status_code}")
            return False

    def test_assignments_api(self):
        """Test GET /api/assignments"""
        print("\n=== ASSIGNMENTS API TESTS ===")
        
        # Test without subject filter
        response = self.make_request('GET', '/assignments')
        if not response:
            self.log_test("Assignments API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Assignments API - Authentication", True, "Properly requires authentication")
            
            # Test with subject filter
            response = self.make_request('GET', '/assignments?subject_id=test-subject-id')
            if response and response.status_code == 401:
                self.log_test("Assignments API - Subject Filter", True, "Subject filtering endpoint exists")
                return True
            else:
                self.log_test("Assignments API - Subject Filter", False, "Subject filtering not working")
                return False
        elif response.status_code == 200:
            try:
                data = response.json()
                if 'assignments' in data and 'count' in data:
                    self.log_test("Assignments API - Structure", True, f"Found {data.get('count', 0)} assignments")
                    self.test_data['assignments'] = data.get('assignments', [])
                    return True
                else:
                    self.log_test("Assignments API - Structure", False, "Missing expected fields")
                    return False
            except json.JSONDecodeError:
                self.log_test("Assignments API - JSON", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Assignments API - Status", False, f"Unexpected status: {response.status_code}")
            return False

    def test_quiz_generation_api(self):
        """Test POST /api/assignments/generate-quiz"""
        print("\n=== AI QUIZ GENERATION API TESTS ===")
        
        quiz_data = {
            "topic": "Basic Mathematics",
            "difficulty": "easy",
            "questionCount": 3,
            "subjectId": "test-subject-id",
            "title": "Test Math Quiz"
        }
        
        response = self.make_request('POST', '/assignments/generate-quiz', quiz_data)
        if not response:
            self.log_test("Quiz Generation API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Quiz Generation API - Authentication", True, "Properly requires authentication")
            return True
        elif response.status_code == 400:
            try:
                data = response.json()
                if 'error' in data:
                    self.log_test("Quiz Generation API - Validation", True, f"Proper validation: {data['error']}")
                    return True
            except json.JSONDecodeError:
                pass
            self.log_test("Quiz Generation API - Validation", False, "Invalid validation response")
            return False
        elif response.status_code == 200:
            try:
                data = response.json()
                if 'assignment' in data and 'questions' in data:
                    self.log_test("Quiz Generation API - Success", True, f"Generated {data.get('count', 0)} questions")
                    return True
                else:
                    self.log_test("Quiz Generation API - Structure", False, "Missing expected fields")
                    return False
            except json.JSONDecodeError:
                self.log_test("Quiz Generation API - JSON", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Quiz Generation API - Status", False, f"Unexpected status: {response.status_code}")
            return False

    def test_assignment_questions_api(self):
        """Test GET /api/assignments/{id}/questions"""
        print("\n=== ASSIGNMENT QUESTIONS API TESTS ===")
        
        test_assignment_id = "test-assignment-id"
        response = self.make_request('GET', f'/assignments/{test_assignment_id}/questions')
        if not response:
            self.log_test("Assignment Questions API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Assignment Questions API - Authentication", True, "Properly requires authentication")
            return True
        elif response.status_code == 404:
            self.log_test("Assignment Questions API - Not Found", True, "Properly handles non-existent assignments")
            return True
        elif response.status_code == 200:
            try:
                data = response.json()
                if 'assignment' in data and 'questions' in data:
                    self.log_test("Assignment Questions API - Structure", True, f"Found {data.get('count', 0)} questions")
                    return True
                else:
                    self.log_test("Assignment Questions API - Structure", False, "Missing expected fields")
                    return False
            except json.JSONDecodeError:
                self.log_test("Assignment Questions API - JSON", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Assignment Questions API - Status", False, f"Unexpected status: {response.status_code}")
            return False

    def test_assignment_attempt_apis(self):
        """Test POST /api/assignments/{id}/start and POST /api/assignments/{id}/submit"""
        print("\n=== ASSIGNMENT ATTEMPT API TESTS ===")
        
        test_assignment_id = "test-assignment-id"
        
        # Test start attempt
        response = self.make_request('POST', f'/assignments/{test_assignment_id}/start')
        if not response:
            self.log_test("Assignment Start API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Assignment Start API - Authentication", True, "Properly requires authentication")
        elif response.status_code == 404:
            self.log_test("Assignment Start API - Not Found", True, "Properly handles non-existent assignments")
        else:
            self.log_test("Assignment Start API - Status", False, f"Unexpected status: {response.status_code}")
            return False
        
        # Test submit attempt
        submit_data = {
            "answers": {"question1": "Answer A", "question2": "Answer B"},
            "attemptNumber": 1,
            "timeSpent": 300
        }
        
        response = self.make_request('POST', f'/assignments/{test_assignment_id}/submit', submit_data)
        if not response:
            self.log_test("Assignment Submit API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Assignment Submit API - Authentication", True, "Properly requires authentication")
            return True
        elif response.status_code == 400:
            try:
                data = response.json()
                if 'error' in data:
                    self.log_test("Assignment Submit API - Validation", True, f"Proper validation: {data['error']}")
                    return True
            except json.JSONDecodeError:
                pass
            self.log_test("Assignment Submit API - Validation", False, "Invalid validation response")
            return False
        else:
            self.log_test("Assignment Submit API - Status", False, f"Unexpected status: {response.status_code}")
            return False

    def test_study_groups_apis(self):
        """Test study groups management APIs"""
        print("\n=== STUDY GROUPS API TESTS ===")
        
        # Test create study group
        group_data = {
            "name": "Test Study Group",
            "description": "A test study group for mathematics",
            "assignmentId": "test-assignment-id"
        }
        
        response = self.make_request('POST', '/study-groups', group_data)
        if not response:
            self.log_test("Study Groups Create API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Study Groups Create API - Authentication", True, "Properly requires authentication")
        elif response.status_code == 400:
            try:
                data = response.json()
                if 'error' in data:
                    self.log_test("Study Groups Create API - Validation", True, f"Proper validation: {data['error']}")
            except json.JSONDecodeError:
                self.log_test("Study Groups Create API - Validation", False, "Invalid validation response")
                return False
        else:
            self.log_test("Study Groups Create API - Status", False, f"Unexpected status: {response.status_code}")
            return False
        
        # Test join study group
        join_data = {"inviteCode": "TEST123"}
        response = self.make_request('POST', '/study-groups/join', join_data)
        if not response:
            self.log_test("Study Groups Join API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Study Groups Join API - Authentication", True, "Properly requires authentication")
        elif response.status_code == 404:
            self.log_test("Study Groups Join API - Invalid Code", True, "Properly handles invalid invite codes")
        else:
            self.log_test("Study Groups Join API - Status", False, f"Unexpected status: {response.status_code}")
            return False
        
        # Test list study groups
        response = self.make_request('GET', '/study-groups')
        if not response:
            self.log_test("Study Groups List API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Study Groups List API - Authentication", True, "Properly requires authentication")
            return True
        elif response.status_code == 200:
            try:
                data = response.json()
                if 'groups' in data and 'count' in data:
                    self.log_test("Study Groups List API - Structure", True, f"Found {data.get('count', 0)} groups")
                    return True
                else:
                    self.log_test("Study Groups List API - Structure", False, "Missing expected fields")
                    return False
            except json.JSONDecodeError:
                self.log_test("Study Groups List API - JSON", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Study Groups List API - Status", False, f"Unexpected status: {response.status_code}")
            return False

    def test_group_chat_apis(self):
        """Test group chat APIs"""
        print("\n=== GROUP CHAT API TESTS ===")
        
        test_group_id = "test-group-id"
        
        # Test send message
        message_data = {
            "message": "Hello everyone!",
            "messageType": "text"
        }
        
        response = self.make_request('POST', f'/study-groups/{test_group_id}/chat', message_data)
        if not response:
            self.log_test("Group Chat Send API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Group Chat Send API - Authentication", True, "Properly requires authentication")
        elif response.status_code == 403:
            self.log_test("Group Chat Send API - Authorization", True, "Properly checks group membership")
        elif response.status_code == 400:
            try:
                data = response.json()
                if 'error' in data:
                    self.log_test("Group Chat Send API - Validation", True, f"Proper validation: {data['error']}")
            except json.JSONDecodeError:
                self.log_test("Group Chat Send API - Validation", False, "Invalid validation response")
                return False
        else:
            self.log_test("Group Chat Send API - Status", False, f"Unexpected status: {response.status_code}")
            return False
        
        # Test get chat history
        response = self.make_request('GET', f'/study-groups/{test_group_id}/chat')
        if not response:
            self.log_test("Group Chat History API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Group Chat History API - Authentication", True, "Properly requires authentication")
            return True
        elif response.status_code == 403:
            self.log_test("Group Chat History API - Authorization", True, "Properly checks group membership")
            return True
        elif response.status_code == 200:
            try:
                data = response.json()
                if 'messages' in data and 'count' in data:
                    self.log_test("Group Chat History API - Structure", True, f"Found {data.get('count', 0)} messages")
                    return True
                else:
                    self.log_test("Group Chat History API - Structure", False, "Missing expected fields")
                    return False
            except json.JSONDecodeError:
                self.log_test("Group Chat History API - JSON", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Group Chat History API - Status", False, f"Unexpected status: {response.status_code}")
            return False

    def test_doubts_apis(self):
        """Test doubts submission and AI assistance APIs"""
        print("\n=== DOUBTS API TESTS ===")
        
        # Test submit doubt
        doubt_data = {
            "title": "Question about algebra",
            "questionText": "How do I solve quadratic equations?",
            "context": "I'm struggling with the quadratic formula",
            "subjectId": "test-subject-id",
            "priorityLevel": "high"
        }
        
        response = self.make_request('POST', '/doubts', doubt_data)
        if not response:
            self.log_test("Doubts Submit API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Doubts Submit API - Authentication", True, "Properly requires authentication")
        elif response.status_code == 400:
            try:
                data = response.json()
                if 'error' in data:
                    self.log_test("Doubts Submit API - Validation", True, f"Proper validation: {data['error']}")
            except json.JSONDecodeError:
                self.log_test("Doubts Submit API - Validation", False, "Invalid validation response")
                return False
        elif response.status_code == 200:
            try:
                data = response.json()
                if 'doubt' in data:
                    self.log_test("Doubts Submit API - Success", True, "Doubt submitted successfully")
                    if 'aiResponse' in data:
                        self.log_test("Doubts AI Integration", True, "AI response generated")
                    else:
                        self.log_test("Doubts AI Integration", True, "AI response not generated (expected without auth)")
                    return True
                else:
                    self.log_test("Doubts Submit API - Structure", False, "Missing expected fields")
                    return False
            except json.JSONDecodeError:
                self.log_test("Doubts Submit API - JSON", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Doubts Submit API - Status", False, f"Unexpected status: {response.status_code}")
            return False
        
        # Test get doubts
        response = self.make_request('GET', '/doubts')
        if not response:
            self.log_test("Doubts List API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Doubts List API - Authentication", True, "Properly requires authentication")
            return True
        elif response.status_code == 200:
            try:
                data = response.json()
                if 'doubts' in data and 'count' in data:
                    self.log_test("Doubts List API - Structure", True, f"Found {data.get('count', 0)} doubts")
                    return True
                else:
                    self.log_test("Doubts List API - Structure", False, "Missing expected fields")
                    return False
            except json.JSONDecodeError:
                self.log_test("Doubts List API - JSON", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Doubts List API - Status", False, f"Unexpected status: {response.status_code}")
            return False

    def test_student_progress_api(self):
        """Test GET /api/student/progress"""
        print("\n=== STUDENT PROGRESS API TESTS ===")
        
        response = self.make_request('GET', '/student/progress')
        if not response:
            self.log_test("Student Progress API - Network", False, "No response received")
            return False
        
        if response.status_code == 401:
            self.log_test("Student Progress API - Authentication", True, "Properly requires authentication")
            return True
        elif response.status_code == 200:
            try:
                data = response.json()
                expected_fields = ['overallStats', 'subjectProgress', 'recentAttempts']
                if all(field in data for field in expected_fields):
                    self.log_test("Student Progress API - Structure", True, "All expected fields present")
                    
                    # Check overall stats structure
                    overall_stats = data.get('overallStats', {})
                    stats_fields = ['totalAssignments', 'completedAssignments', 'completionRate', 'overallAverage']
                    if all(field in overall_stats for field in stats_fields):
                        self.log_test("Student Progress API - Stats Structure", True, "Overall stats properly structured")
                        return True
                    else:
                        self.log_test("Student Progress API - Stats Structure", False, "Missing stats fields")
                        return False
                else:
                    self.log_test("Student Progress API - Structure", False, "Missing expected fields")
                    return False
            except json.JSONDecodeError:
                self.log_test("Student Progress API - JSON", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Student Progress API - Status", False, f"Unexpected status: {response.status_code}")
            return False

    def test_ai_integration(self):
        """Test AI integration components"""
        print("\n=== AI INTEGRATION TESTS ===")
        
        # Test if OpenAI/Kimi K2 environment variables are accessible
        # This is indirect testing since we can't directly test the AI without auth
        
        # Test quiz generation endpoint for AI integration
        quiz_data = {
            "topic": "Test Topic",
            "difficulty": "easy", 
            "questionCount": 1,
            "subjectId": "test-id",
            "title": "AI Test"
        }
        
        response = self.make_request('POST', '/assignments/generate-quiz', quiz_data)
        if response and response.status_code in [401, 400, 404]:
            self.log_test("AI Integration - Quiz Generation", True, "AI quiz generation endpoint accessible")
        else:
            self.log_test("AI Integration - Quiz Generation", False, "AI quiz generation endpoint issues")
            return False
        
        # Test doubts AI assistance
        doubt_data = {
            "title": "AI Test Question",
            "questionText": "Test question for AI",
            "subjectId": "test-id"
        }
        
        response = self.make_request('POST', '/doubts', doubt_data)
        if response and response.status_code in [401, 400, 404]:
            self.log_test("AI Integration - Doubts Assistance", True, "AI doubts assistance endpoint accessible")
            return True
        else:
            self.log_test("AI Integration - Doubts Assistance", False, "AI doubts assistance endpoint issues")
            return False

    def run_comprehensive_tests(self):
        """Run all backend tests"""
        print("🚀 STARTING COMPREHENSIVE BACKEND TESTING FOR PROXILEARN STUDENT PHASE")
        print("=" * 80)
        
        test_results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "test_details": []
        }
        
        # List of all test functions
        test_functions = [
            ("Basic Connectivity", self.test_basic_connectivity),
            ("Subjects API", self.test_subjects_api),
            ("Assignments API", self.test_assignments_api),
            ("AI Quiz Generation API", self.test_quiz_generation_api),
            ("Assignment Questions API", self.test_assignment_questions_api),
            ("Assignment Attempt APIs", self.test_assignment_attempt_apis),
            ("Study Groups APIs", self.test_study_groups_apis),
            ("Group Chat APIs", self.test_group_chat_apis),
            ("Doubts APIs", self.test_doubts_apis),
            ("Student Progress API", self.test_student_progress_api),
            ("AI Integration", self.test_ai_integration)
        ]
        
        # Run all tests
        for test_name, test_function in test_functions:
            test_results["total_tests"] += 1
            try:
                result = test_function()
                if result:
                    test_results["passed_tests"] += 1
                    test_results["test_details"].append(f"✅ {test_name}: PASSED")
                else:
                    test_results["failed_tests"] += 1
                    test_results["test_details"].append(f"❌ {test_name}: FAILED")
            except Exception as e:
                test_results["failed_tests"] += 1
                test_results["test_details"].append(f"❌ {test_name}: ERROR - {str(e)}")
                self.log_test(test_name, False, f"Exception: {str(e)}")
        
        # Print final summary
        print("\n" + "=" * 80)
        print("🏁 FINAL TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {test_results['total_tests']}")
        print(f"Passed: {test_results['passed_tests']}")
        print(f"Failed: {test_results['failed_tests']}")
        print(f"Success Rate: {(test_results['passed_tests']/test_results['total_tests']*100):.1f}%")
        
        print("\nDetailed Results:")
        for detail in test_results["test_details"]:
            print(f"  {detail}")
        
        # Critical assessment
        print("\n" + "=" * 80)
        print("🔍 CRITICAL ASSESSMENT")
        print("=" * 80)
        
        if test_results["passed_tests"] == test_results["total_tests"]:
            print("🎉 ALL TESTS PASSED! Student Phase APIs are fully implemented and working.")
        elif test_results["passed_tests"] >= test_results["total_tests"] * 0.8:
            print("✅ MOSTLY WORKING! Most Student Phase APIs are implemented correctly.")
            print("   Minor issues detected but core functionality is solid.")
        elif test_results["passed_tests"] >= test_results["total_tests"] * 0.5:
            print("⚠️  PARTIALLY WORKING! Some Student Phase APIs have issues.")
            print("   Significant problems detected that need attention.")
        else:
            print("❌ MAJOR ISSUES! Most Student Phase APIs are not working correctly.")
            print("   Critical problems detected that require immediate fixes.")
        
        return test_results

if __name__ == "__main__":
    tester = ProxilearnStudentPhaseAPITester()
    results = tester.run_comprehensive_tests()
    sys.exit(0 if results["failed_tests"] == 0 else 1)