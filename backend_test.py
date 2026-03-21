#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Wedding Management App
Tests all Budget and Task CRUD operations with realistic wedding data
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment
BASE_URL = "https://nuptial-checklist.preview.emergentagent.com/api"

class WeddingAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.created_budget_ids = []
        self.created_task_ids = []
        self.test_results = {
            "budget_crud": {"passed": 0, "failed": 0, "errors": []},
            "task_crud": {"passed": 0, "failed": 0, "errors": []},
            "budget_categories": {"passed": 0, "failed": 0, "errors": []},
            "summary_calculations": {"passed": 0, "failed": 0, "errors": []}
        }

    def log_result(self, category, test_name, success, message=""):
        """Log test result"""
        if success:
            self.test_results[category]["passed"] += 1
            print(f"✅ {test_name}: PASSED")
        else:
            self.test_results[category]["failed"] += 1
            self.test_results[category]["errors"].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")

    def test_budget_categories(self):
        """Test GET /api/budget-categories"""
        print("\n=== Testing Budget Categories API ===")
        
        try:
            response = self.session.get(f"{self.base_url}/budget-categories")
            
            if response.status_code == 200:
                data = response.json()
                expected_categories = ["Venue", "Catering", "Photography", "Decorations", "Attire", "Entertainment", "Invitations", "Flowers"]
                
                if "categories" in data and isinstance(data["categories"], list):
                    if all(cat in data["categories"] for cat in expected_categories):
                        self.log_result("budget_categories", "Get Budget Categories", True)
                    else:
                        self.log_result("budget_categories", "Get Budget Categories", False, f"Missing expected categories. Got: {data['categories']}")
                else:
                    self.log_result("budget_categories", "Get Budget Categories", False, f"Invalid response format: {data}")
            else:
                self.log_result("budget_categories", "Get Budget Categories", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("budget_categories", "Get Budget Categories", False, f"Exception: {str(e)}")

    def test_budget_crud(self):
        """Test Budget CRUD operations"""
        print("\n=== Testing Budget CRUD APIs ===")
        
        # Test data for wedding budget items
        budget_items = [
            {"category": "Venue", "budgeted_amount": 15000.0, "spent_amount": 12000.0, "notes": "Grand ballroom at Rosewood Hotel", "is_custom": False},
            {"category": "Catering", "budgeted_amount": 8000.0, "spent_amount": 0.0, "notes": "3-course dinner for 150 guests", "is_custom": False},
            {"category": "Wedding Favors", "budgeted_amount": 500.0, "spent_amount": 350.0, "notes": "Personalized candles", "is_custom": True}
        ]
        
        # Test GET empty budgets first
        try:
            response = self.session.get(f"{self.base_url}/budgets")
            if response.status_code == 200:
                data = response.json()
                if "total_budgeted" in data and "total_spent" in data and "remaining" in data and "items" in data:
                    self.log_result("budget_crud", "Get Empty Budgets", True)
                else:
                    self.log_result("budget_crud", "Get Empty Budgets", False, f"Invalid response format: {data}")
            else:
                self.log_result("budget_crud", "Get Empty Budgets", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("budget_crud", "Get Empty Budgets", False, f"Exception: {str(e)}")
        
        # Test POST - Create budget items
        for i, item in enumerate(budget_items):
            try:
                response = self.session.post(f"{self.base_url}/budgets", json=item)
                
                if response.status_code == 200:
                    data = response.json()
                    if "id" in data and data["category"] == item["category"]:
                        self.created_budget_ids.append(data["id"])
                        self.log_result("budget_crud", f"Create Budget Item {i+1}", True)
                    else:
                        self.log_result("budget_crud", f"Create Budget Item {i+1}", False, f"Invalid response: {data}")
                else:
                    self.log_result("budget_crud", f"Create Budget Item {i+1}", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_result("budget_crud", f"Create Budget Item {i+1}", False, f"Exception: {str(e)}")
        
        # Test GET with data and verify summary calculations
        try:
            response = self.session.get(f"{self.base_url}/budgets")
            if response.status_code == 200:
                data = response.json()
                
                # Verify structure
                if "total_budgeted" in data and "total_spent" in data and "remaining" in data and "items" in data:
                    self.log_result("budget_crud", "Get Budgets with Data", True)
                    
                    # Verify calculations
                    expected_total_budgeted = sum(item["budgeted_amount"] for item in budget_items)
                    expected_total_spent = sum(item["spent_amount"] for item in budget_items)
                    expected_remaining = expected_total_budgeted - expected_total_spent
                    
                    if (abs(data["total_budgeted"] - expected_total_budgeted) < 0.01 and
                        abs(data["total_spent"] - expected_total_spent) < 0.01 and
                        abs(data["remaining"] - expected_remaining) < 0.01):
                        self.log_result("summary_calculations", "Budget Summary Calculations", True)
                    else:
                        self.log_result("summary_calculations", "Budget Summary Calculations", False, 
                                      f"Expected: budgeted={expected_total_budgeted}, spent={expected_total_spent}, remaining={expected_remaining}. "
                                      f"Got: budgeted={data['total_budgeted']}, spent={data['total_spent']}, remaining={data['remaining']}")
                    
                    # Verify items count
                    if len(data["items"]) == len(budget_items):
                        self.log_result("budget_crud", "Budget Items Count", True)
                    else:
                        self.log_result("budget_crud", "Budget Items Count", False, f"Expected {len(budget_items)} items, got {len(data['items'])}")
                        
                else:
                    self.log_result("budget_crud", "Get Budgets with Data", False, f"Invalid response format: {data}")
            else:
                self.log_result("budget_crud", "Get Budgets with Data", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("budget_crud", "Get Budgets with Data", False, f"Exception: {str(e)}")
        
        # Test PUT - Update budget item
        if self.created_budget_ids:
            try:
                budget_id = self.created_budget_ids[0]
                update_data = {"category": "Venue", "budgeted_amount": 16000.0, "spent_amount": 14000.0, "notes": "Updated venue booking", "is_custom": False}
                
                response = self.session.put(f"{self.base_url}/budgets/{budget_id}", json=update_data)
                
                if response.status_code == 200:
                    data = response.json()
                    if data["budgeted_amount"] == 16000.0 and data["spent_amount"] == 14000.0:
                        self.log_result("budget_crud", "Update Budget Item", True)
                    else:
                        self.log_result("budget_crud", "Update Budget Item", False, f"Update not reflected: {data}")
                else:
                    self.log_result("budget_crud", "Update Budget Item", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_result("budget_crud", "Update Budget Item", False, f"Exception: {str(e)}")
        
        # Test DELETE - Delete budget item
        if self.created_budget_ids:
            try:
                budget_id = self.created_budget_ids.pop()  # Remove last item
                
                response = self.session.delete(f"{self.base_url}/budgets/{budget_id}")
                
                if response.status_code == 200:
                    data = response.json()
                    if "message" in data and "deleted" in data["message"].lower():
                        self.log_result("budget_crud", "Delete Budget Item", True)
                    else:
                        self.log_result("budget_crud", "Delete Budget Item", False, f"Unexpected response: {data}")
                else:
                    self.log_result("budget_crud", "Delete Budget Item", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_result("budget_crud", "Delete Budget Item", False, f"Exception: {str(e)}")
        
        # Test error cases
        try:
            # Invalid budget ID with PUT (since there's no GET endpoint for individual budgets)
            response = self.session.put(f"{self.base_url}/budgets/invalid_id", json={"category": "Test", "budgeted_amount": 100})
            if response.status_code in [400, 404]:
                self.log_result("budget_crud", "Invalid Budget ID Error Handling", True)
            else:
                self.log_result("budget_crud", "Invalid Budget ID Error Handling", False, f"Expected 400/404, got {response.status_code}")
        except Exception as e:
            self.log_result("budget_crud", "Invalid Budget ID Error Handling", False, f"Exception: {str(e)}")

    def test_task_crud(self):
        """Test Task CRUD operations"""
        print("\n=== Testing Task CRUD APIs ===")
        
        # Test data for wedding tasks
        tasks = [
            {"title": "Book wedding venue", "description": "Reserve the Grand Ballroom at Rosewood Hotel", "assigned_to": "Sarah"},
            {"title": "Send invitations", "description": "Mail wedding invitations to all guests", "assigned_to": "Michael"},
            {"title": "Order wedding cake", "description": "3-tier vanilla cake with roses", "assigned_to": "Sarah"}
        ]
        
        # Test GET empty tasks first
        try:
            response = self.session.get(f"{self.base_url}/tasks")
            if response.status_code == 200:
                data = response.json()
                if "total_tasks" in data and "completed_tasks" in data and "pending_tasks" in data and "tasks" in data:
                    self.log_result("task_crud", "Get Empty Tasks", True)
                else:
                    self.log_result("task_crud", "Get Empty Tasks", False, f"Invalid response format: {data}")
            else:
                self.log_result("task_crud", "Get Empty Tasks", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("task_crud", "Get Empty Tasks", False, f"Exception: {str(e)}")
        
        # Test POST - Create tasks
        for i, task in enumerate(tasks):
            try:
                response = self.session.post(f"{self.base_url}/tasks", json=task)
                
                if response.status_code == 200:
                    data = response.json()
                    if "id" in data and data["title"] == task["title"] and data["completed"] == False:
                        self.created_task_ids.append(data["id"])
                        self.log_result("task_crud", f"Create Task {i+1}", True)
                    else:
                        self.log_result("task_crud", f"Create Task {i+1}", False, f"Invalid response: {data}")
                else:
                    self.log_result("task_crud", f"Create Task {i+1}", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_result("task_crud", f"Create Task {i+1}", False, f"Exception: {str(e)}")
        
        # Test GET with data and verify summary calculations
        try:
            response = self.session.get(f"{self.base_url}/tasks")
            if response.status_code == 200:
                data = response.json()
                
                # Verify structure
                if "total_tasks" in data and "completed_tasks" in data and "pending_tasks" in data and "tasks" in data:
                    self.log_result("task_crud", "Get Tasks with Data", True)
                    
                    # Verify calculations
                    expected_total = len(tasks)
                    expected_completed = 0  # All tasks start as incomplete
                    expected_pending = expected_total - expected_completed
                    
                    if (data["total_tasks"] == expected_total and
                        data["completed_tasks"] == expected_completed and
                        data["pending_tasks"] == expected_pending):
                        self.log_result("summary_calculations", "Task Summary Calculations", True)
                    else:
                        self.log_result("summary_calculations", "Task Summary Calculations", False, 
                                      f"Expected: total={expected_total}, completed={expected_completed}, pending={expected_pending}. "
                                      f"Got: total={data['total_tasks']}, completed={data['completed_tasks']}, pending={data['pending_tasks']}")
                    
                    # Verify items count
                    if len(data["tasks"]) == len(tasks):
                        self.log_result("task_crud", "Task Items Count", True)
                    else:
                        self.log_result("task_crud", "Task Items Count", False, f"Expected {len(tasks)} tasks, got {len(data['tasks'])}")
                        
                else:
                    self.log_result("task_crud", "Get Tasks with Data", False, f"Invalid response format: {data}")
            else:
                self.log_result("task_crud", "Get Tasks with Data", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("task_crud", "Get Tasks with Data", False, f"Exception: {str(e)}")
        
        # Test PATCH - Toggle task completion
        if self.created_task_ids:
            try:
                task_id = self.created_task_ids[0]
                
                # Toggle to completed
                response = self.session.patch(f"{self.base_url}/tasks/{task_id}/toggle")
                
                if response.status_code == 200:
                    data = response.json()
                    if data["completed"] == True:
                        self.log_result("task_crud", "Toggle Task to Completed", True)
                        
                        # Toggle back to incomplete
                        response2 = self.session.patch(f"{self.base_url}/tasks/{task_id}/toggle")
                        if response2.status_code == 200:
                            data2 = response2.json()
                            if data2["completed"] == False:
                                self.log_result("task_crud", "Toggle Task to Incomplete", True)
                            else:
                                self.log_result("task_crud", "Toggle Task to Incomplete", False, f"Task still completed: {data2}")
                        else:
                            self.log_result("task_crud", "Toggle Task to Incomplete", False, f"HTTP {response2.status_code}: {response2.text}")
                    else:
                        self.log_result("task_crud", "Toggle Task to Completed", False, f"Task not completed: {data}")
                else:
                    self.log_result("task_crud", "Toggle Task to Completed", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_result("task_crud", "Toggle Task", False, f"Exception: {str(e)}")
        
        # Test PUT - Update task
        if self.created_task_ids:
            try:
                task_id = self.created_task_ids[0]
                update_data = {"title": "Book wedding venue - UPDATED", "description": "Updated description", "assigned_to": "Sarah"}
                
                response = self.session.put(f"{self.base_url}/tasks/{task_id}", json=update_data)
                
                if response.status_code == 200:
                    data = response.json()
                    if "UPDATED" in data["title"] and data["description"] == "Updated description":
                        self.log_result("task_crud", "Update Task", True)
                    else:
                        self.log_result("task_crud", "Update Task", False, f"Update not reflected: {data}")
                else:
                    self.log_result("task_crud", "Update Task", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_result("task_crud", "Update Task", False, f"Exception: {str(e)}")
        
        # Test DELETE - Delete task
        if self.created_task_ids:
            try:
                task_id = self.created_task_ids.pop()  # Remove last item
                
                response = self.session.delete(f"{self.base_url}/tasks/{task_id}")
                
                if response.status_code == 200:
                    data = response.json()
                    if "message" in data and "deleted" in data["message"].lower():
                        self.log_result("task_crud", "Delete Task", True)
                    else:
                        self.log_result("task_crud", "Delete Task", False, f"Unexpected response: {data}")
                else:
                    self.log_result("task_crud", "Delete Task", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_result("task_crud", "Delete Task", False, f"Exception: {str(e)}")
        
        # Test error cases
        try:
            # Invalid task ID with PUT (since there's no GET endpoint for individual tasks)
            response = self.session.put(f"{self.base_url}/tasks/invalid_id", json={"title": "Test", "assigned_to": "Test"})
            if response.status_code in [400, 404]:
                self.log_result("task_crud", "Invalid Task ID Error Handling", True)
            else:
                self.log_result("task_crud", "Invalid Task ID Error Handling", False, f"Expected 400/404, got {response.status_code}")
        except Exception as e:
            self.log_result("task_crud", "Invalid Task ID Error Handling", False, f"Exception: {str(e)}")

    def cleanup(self):
        """Clean up created test data"""
        print("\n=== Cleaning up test data ===")
        
        # Delete remaining budget items
        for budget_id in self.created_budget_ids:
            try:
                self.session.delete(f"{self.base_url}/budgets/{budget_id}")
                print(f"Deleted budget {budget_id}")
            except:
                pass
        
        # Delete remaining tasks
        for task_id in self.created_task_ids:
            try:
                self.session.delete(f"{self.base_url}/tasks/{task_id}")
                print(f"Deleted task {task_id}")
            except:
                pass

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("WEDDING MANAGEMENT APP - BACKEND API TEST SUMMARY")
        print("="*60)
        
        total_passed = sum(category["passed"] for category in self.test_results.values())
        total_failed = sum(category["failed"] for category in self.test_results.values())
        total_tests = total_passed + total_failed
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {total_passed}")
        print(f"Failed: {total_failed}")
        print(f"Success Rate: {(total_passed/total_tests*100):.1f}%" if total_tests > 0 else "No tests run")
        
        print("\nDetailed Results:")
        for category, results in self.test_results.items():
            print(f"\n{category.upper().replace('_', ' ')}:")
            print(f"  Passed: {results['passed']}")
            print(f"  Failed: {results['failed']}")
            if results['errors']:
                print("  Errors:")
                for error in results['errors']:
                    print(f"    - {error}")
        
        return total_failed == 0

    def run_all_tests(self):
        """Run all backend API tests"""
        print(f"Starting Wedding Management App Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print(f"Test started at: {datetime.now()}")
        
        try:
            self.test_budget_categories()
            self.test_budget_crud()
            self.test_task_crud()
        finally:
            self.cleanup()
        
        success = self.print_summary()
        return success

if __name__ == "__main__":
    tester = WeddingAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)