#!/usr/bin/env python3
"""
Student Phase Backend Testing Suite for Proxilearn
Tests all Student Phase APIs including AI Quiz Generation, Assignments, Study Groups, Doubts, etc.
"""

import requests
import json
import os
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "http://localhost:3000"
API_BASE_URL = f"{BASE_URL}/api"

class StudentPhaseBackendTester:
    def __init__(self):
        self.test_results = []
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Proxilearn-StudentPhase-Tester/1.0'
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

    def test_ai_quiz_generation(self):
        """Test AI Quiz Generation API - POST /api/assignments/generate-quiz"""
        print("\n=== Testing AI Quiz Generation API ===")
        
        try:
            quiz_data = {
                "topic": "Basic Algebra",
                "subject": "Mathematics", 
                "difficulty": "intermediate",
                "question_count": 5
            }
            
            response = self.session.post(f"{API_BASE_URL}/assignments/generate-quiz", 
                                       json=quiz_data, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if 'assignment_id' in data and 'questions' in data:
                    self.log_test("AI Quiz Generation", True, 
                                "AI quiz generation working correctly",
                                {"status_code": response.status_code, "assignment_id": data.get('assignment_id')})
                    return True
                else:
                    self.log_test("AI Quiz Generation", False, 
                                "Invalid response format",
                                {"status_code": response.status_code, "response": data})
                    return False
            elif response.status_code == 404:
                self.log_test("AI Quiz Generation", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                return False
            else:
                self.log_test("AI Quiz Generation", False, 
                            f"HTTP {response.status_code}: {response.text}",
                            {"status_code": response.status_code})
                return False

        except Exception as e:
            self.log_test("AI Quiz Generation", False, 
                        f"Error testing AI quiz generation: {str(e)}")
            return False

    def test_subjects_api(self):
        """Test Subjects API - GET /api/subjects"""
        print("\n=== Testing Subjects API ===")
        
        try:
            response = self.session.get(f"{API_BASE_URL}/subjects", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Subjects API", True, 
                                "Subjects API working correctly",
                                {"status_code": response.status_code, "subjects_count": len(data)})
                    return True
                else:
                    self.log_test("Subjects API", False, 
                                "Invalid response format - expected array",
                                {"status_code": response.status_code, "response_type": type(data)})
                    return False
            elif response.status_code == 404:
                self.log_test("Subjects API", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                return False
            else:
                self.log_test("Subjects API", False, 
                            f"HTTP {response.status_code}: {response.text}",
                            {"status_code": response.status_code})
                return False

        except Exception as e:
            self.log_test("Subjects API", False, 
                        f"Error testing subjects API: {str(e)}")
            return False

    def test_assignments_api(self):
        """Test Assignments API - GET /api/assignments"""
        print("\n=== Testing Assignments API ===")
        
        try:
            response = self.session.get(f"{API_BASE_URL}/assignments", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Assignments API", True, 
                                "Assignments API working correctly",
                                {"status_code": response.status_code, "assignments_count": len(data)})
                    return True
                else:
                    self.log_test("Assignments API", False, 
                                "Invalid response format - expected array",
                                {"status_code": response.status_code, "response_type": type(data)})
                    return False
            elif response.status_code == 404:
                self.log_test("Assignments API", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                return False
            else:
                self.log_test("Assignments API", False, 
                            f"HTTP {response.status_code}: {response.text}",
                            {"status_code": response.status_code})
                return False

        except Exception as e:
            self.log_test("Assignments API", False, 
                        f"Error testing assignments API: {str(e)}")
            return False

    def test_assignment_questions_api(self):
        """Test Assignment Questions API - GET /api/assignments/{id}/questions"""
        print("\n=== Testing Assignment Questions API ===")
        
        try:
            # Use a sample UUID for testing
            sample_assignment_id = str(uuid.uuid4())
            response = self.session.get(f"{API_BASE_URL}/assignments/{sample_assignment_id}/questions", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Assignment Questions API", True, 
                                "Assignment questions API working correctly",
                                {"status_code": response.status_code, "questions_count": len(data)})
                    return True
                else:
                    self.log_test("Assignment Questions API", False, 
                                "Invalid response format - expected array",
                                {"status_code": response.status_code, "response_type": type(data)})
                    return False
            elif response.status_code == 404:
                self.log_test("Assignment Questions API", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                return False
            else:
                self.log_test("Assignment Questions API", False, 
                            f"HTTP {response.status_code}: {response.text}",
                            {"status_code": response.status_code})
                return False

        except Exception as e:
            self.log_test("Assignment Questions API", False, 
                        f"Error testing assignment questions API: {str(e)}")
            return False

    def test_assignment_attempt_system(self):
        """Test Assignment Attempt System - POST /api/assignments/{id}/start and POST /api/assignments/{id}/submit"""
        print("\n=== Testing Assignment Attempt System ===")
        
        try:
            sample_assignment_id = str(uuid.uuid4())
            
            # Test start attempt
            response = self.session.post(f"{API_BASE_URL}/assignments/{sample_assignment_id}/start", 
                                       json={}, timeout=10)
            
            if response.status_code == 404:
                self.log_test("Assignment Attempt Start", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                start_success = False
            else:
                start_success = response.status_code == 200
                self.log_test("Assignment Attempt Start", start_success, 
                            f"Start attempt endpoint response: {response.status_code}",
                            {"status_code": response.status_code})

            # Test submit attempt
            submit_data = {
                "answers": [
                    {"question_id": str(uuid.uuid4()), "answer": "A"},
                    {"question_id": str(uuid.uuid4()), "answer": "B"}
                ]
            }
            
            response = self.session.post(f"{API_BASE_URL}/assignments/{sample_assignment_id}/submit", 
                                       json=submit_data, timeout=10)
            
            if response.status_code == 404:
                self.log_test("Assignment Attempt Submit", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                submit_success = False
            else:
                submit_success = response.status_code == 200
                self.log_test("Assignment Attempt Submit", submit_success, 
                            f"Submit attempt endpoint response: {response.status_code}",
                            {"status_code": response.status_code})

            return start_success and submit_success

        except Exception as e:
            self.log_test("Assignment Attempt System", False, 
                        f"Error testing assignment attempt system: {str(e)}")
            return False

    def test_study_groups_api(self):
        """Test Study Groups API - POST /api/study-groups, POST /api/study-groups/join, GET /api/study-groups"""
        print("\n=== Testing Study Groups API ===")
        
        try:
            # Test create study group
            group_data = {
                "name": "Math Study Group",
                "description": "Group for algebra practice",
                "assignment_id": str(uuid.uuid4())
            }
            
            response = self.session.post(f"{API_BASE_URL}/study-groups", 
                                       json=group_data, timeout=10)
            
            if response.status_code == 404:
                self.log_test("Study Groups Create", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                create_success = False
            else:
                create_success = response.status_code == 200
                self.log_test("Study Groups Create", create_success, 
                            f"Create study group endpoint response: {response.status_code}",
                            {"status_code": response.status_code})

            # Test join study group
            join_data = {"invite_code": "ABC123"}
            response = self.session.post(f"{API_BASE_URL}/study-groups/join", 
                                       json=join_data, timeout=10)
            
            if response.status_code == 404:
                self.log_test("Study Groups Join", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                join_success = False
            else:
                join_success = response.status_code in [200, 400]  # 400 for invalid code is acceptable
                self.log_test("Study Groups Join", join_success, 
                            f"Join study group endpoint response: {response.status_code}",
                            {"status_code": response.status_code})

            # Test list study groups
            response = self.session.get(f"{API_BASE_URL}/study-groups", timeout=10)
            
            if response.status_code == 404:
                self.log_test("Study Groups List", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                list_success = False
            else:
                list_success = response.status_code == 200
                self.log_test("Study Groups List", list_success, 
                            f"List study groups endpoint response: {response.status_code}",
                            {"status_code": response.status_code})

            return create_success and join_success and list_success

        except Exception as e:
            self.log_test("Study Groups API", False, 
                        f"Error testing study groups API: {str(e)}")
            return False

    def test_group_chat_api(self):
        """Test Group Chat API - POST /api/study-groups/{id}/chat, GET /api/study-groups/{id}/chat"""
        print("\n=== Testing Group Chat API ===")
        
        try:
            sample_group_id = str(uuid.uuid4())
            
            # Test send message
            message_data = {
                "message_text": "Hello everyone!",
                "message_type": "text"
            }
            
            response = self.session.post(f"{API_BASE_URL}/study-groups/{sample_group_id}/chat", 
                                       json=message_data, timeout=10)
            
            if response.status_code == 404:
                self.log_test("Group Chat Send", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                send_success = False
            else:
                send_success = response.status_code == 200
                self.log_test("Group Chat Send", send_success, 
                            f"Send chat message endpoint response: {response.status_code}",
                            {"status_code": response.status_code})

            # Test get messages
            response = self.session.get(f"{API_BASE_URL}/study-groups/{sample_group_id}/chat", timeout=10)
            
            if response.status_code == 404:
                self.log_test("Group Chat Get", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                get_success = False
            else:
                get_success = response.status_code == 200
                self.log_test("Group Chat Get", get_success, 
                            f"Get chat messages endpoint response: {response.status_code}",
                            {"status_code": response.status_code})

            return send_success and get_success

        except Exception as e:
            self.log_test("Group Chat API", False, 
                        f"Error testing group chat API: {str(e)}")
            return False

    def test_doubts_api(self):
        """Test Doubts API - POST /api/doubts, GET /api/doubts"""
        print("\n=== Testing Doubts API ===")
        
        try:
            # Test submit doubt
            doubt_data = {
                "title": "Question about quadratic equations",
                "question_text": "How do I solve x^2 + 5x + 6 = 0?",
                "subject": "Mathematics",
                "context": "Algebra homework"
            }
            
            response = self.session.post(f"{API_BASE_URL}/doubts", 
                                       json=doubt_data, timeout=30)
            
            if response.status_code == 404:
                self.log_test("Doubts Submit", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                submit_success = False
            else:
                submit_success = response.status_code == 200
                self.log_test("Doubts Submit", submit_success, 
                            f"Submit doubt endpoint response: {response.status_code}",
                            {"status_code": response.status_code})

            # Test get doubts
            response = self.session.get(f"{API_BASE_URL}/doubts", timeout=10)
            
            if response.status_code == 404:
                self.log_test("Doubts Get", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                get_success = False
            else:
                get_success = response.status_code == 200
                self.log_test("Doubts Get", get_success, 
                            f"Get doubts endpoint response: {response.status_code}",
                            {"status_code": response.status_code})

            return submit_success and get_success

        except Exception as e:
            self.log_test("Doubts API", False, 
                        f"Error testing doubts API: {str(e)}")
            return False

    def test_student_progress_api(self):
        """Test Student Progress API - GET /api/student/progress"""
        print("\n=== Testing Student Progress API ===")
        
        try:
            response = self.session.get(f"{API_BASE_URL}/student/progress", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and 'progress' in data:
                    self.log_test("Student Progress API", True, 
                                "Student progress API working correctly",
                                {"status_code": response.status_code})
                    return True
                else:
                    self.log_test("Student Progress API", False, 
                                "Invalid response format",
                                {"status_code": response.status_code, "response": data})
                    return False
            elif response.status_code == 404:
                self.log_test("Student Progress API", False, 
                            "API endpoint not implemented",
                            {"status_code": response.status_code, "error": "Route not found"})
                return False
            else:
                self.log_test("Student Progress API", False, 
                            f"HTTP {response.status_code}: {response.text}",
                            {"status_code": response.status_code})
                return False

        except Exception as e:
            self.log_test("Student Progress API", False, 
                        f"Error testing student progress API: {str(e)}")
            return False

    def test_openai_integration(self):
        """Test OpenAI/Kimi K2 Integration"""
        print("\n=== Testing OpenAI/Kimi K2 Integration ===")
        
        try:
            # Check environment variables
            env_file_path = "/app/.env"
            with open(env_file_path, 'r') as f:
                env_content = f.read()

            required_ai_vars = [
                'OPENROUTER_API_KEY',
                'OPENROUTER_BASE_URL',
                'KIMI_MODEL'
            ]

            missing_vars = []
            for var in required_ai_vars:
                if var not in env_content:
                    missing_vars.append(var)

            if missing_vars:
                self.log_test("OpenAI Integration Config", False, 
                            f"Missing AI environment variables: {', '.join(missing_vars)}")
                return False
            else:
                self.log_test("OpenAI Integration Config", True, 
                            "AI environment variables configured correctly")
                
                # Test if AI integration is actually used in quiz generation
                # This would be tested through the quiz generation endpoint
                return True

        except Exception as e:
            self.log_test("OpenAI Integration", False, 
                        f"Error testing OpenAI integration: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all Student Phase backend tests"""
        print("🚀 Starting Proxilearn Student Phase Backend Testing Suite")
        print(f"Testing against: {API_BASE_URL}")
        print("=" * 70)

        # Run all tests
        tests = [
            ("AI Quiz Generation with Kimi K2", self.test_ai_quiz_generation),
            ("Subjects Management API", self.test_subjects_api),
            ("Assignments API", self.test_assignments_api),
            ("Assignment Questions API", self.test_assignment_questions_api),
            ("Assignment Attempt System", self.test_assignment_attempt_system),
            ("Study Groups Management", self.test_study_groups_api),
            ("Real-time Group Chat", self.test_group_chat_api),
            ("Doubts Submission and AI Assistance", self.test_doubts_api),
            ("Student Progress Tracking", self.test_student_progress_api),
            ("OpenAI/Kimi K2 Integration", self.test_openai_integration)
        ]

        passed = 0
        failed = 0
        results = {}

        for test_name, test_func in tests:
            try:
                result = test_func()
                results[test_name] = result
                if result:
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL - {test_name}: Unexpected error: {str(e)}")
                results[test_name] = False
                failed += 1

        # Print summary
        print("\n" + "=" * 70)
        print("🏁 STUDENT PHASE TEST SUMMARY")
        print("=" * 70)
        
        for test_name, result in results.items():
            status = "✅ WORKING" if result else "❌ NOT IMPLEMENTED"
            print(f"{status} - {test_name}")
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"✅ Working: {passed}")
        print(f"❌ Not Implemented: {failed}")
        print(f"📈 Total: {passed + failed}")
        
        if failed == 0:
            print("🎉 All Student Phase APIs are implemented and working!")
        else:
            print(f"⚠️  {failed} Student Phase API(s) are not implemented")
            print("\n🔧 REQUIRED ACTIONS:")
            print("- Implement missing API endpoints in /app/api/[[...path]]/route.js")
            print("- Add proper authentication and authorization")
            print("- Integrate with Supabase database using the provided schema")
            print("- Test AI integration with Kimi K2 API")

        return failed == 0

if __name__ == "__main__":
    tester = StudentPhaseBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)