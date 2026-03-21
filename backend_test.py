#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Wedding Management App
Focus: Testing subcategory support for Indian wedding context
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment
BASE_URL = "https://nuptial-checklist.preview.emergentagent.com/api"

class WeddingAppTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = []
        self.created_budget_ids = []
        self.created_task_ids = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "success": success,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()

    def test_budget_categories(self):
        """Test GET /api/budget-categories"""
        try:
            response = requests.get(f"{self.base_url}/budget-categories")
            
            if response.status_code == 200:
                data = response.json()
                expected_categories = ["Venue", "Catering", "Photography", "Decorations", "Attire", "Entertainment", "Invitations", "Flowers"]
                
                if "categories" in data and data["categories"] == expected_categories:
                    self.log_test("Budget Categories API", True, f"Returned {len(data['categories'])} categories")
                else:
                    self.log_test("Budget Categories API", False, f"Unexpected categories: {data}")
            else:
                self.log_test("Budget Categories API", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Budget Categories API", False, f"Exception: {str(e)}")

    def test_budget_crud_with_subcategories(self):
        """Test budget CRUD operations with subcategory support"""
        
        # Test 1: Create budget item with subcategory (Indian wedding context)
        try:
            budget_data = {
                "category": "Attire",
                "subcategory": "Groom Sherwani",
                "budgeted_amount": 150000,  # 1.5 lakhs INR
                "spent_amount": 0,
                "notes": "Designer sherwani for wedding day",
                "is_custom": False
            }
            
            response = requests.post(f"{self.base_url}/budgets", json=budget_data)
            
            if response.status_code == 200:
                data = response.json()
                if ("subcategory" in data and data["subcategory"] == "Groom Sherwani" and 
                    data["category"] == "Attire" and data["budgeted_amount"] == 150000):
                    self.created_budget_ids.append(data["id"])
                    self.log_test("Create Budget with Subcategory", True, f"Created budget item with subcategory: {data['subcategory']}")
                else:
                    self.log_test("Create Budget with Subcategory", False, f"Missing or incorrect subcategory field: {data}")
            else:
                self.log_test("Create Budget with Subcategory", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Create Budget with Subcategory", False, f"Exception: {str(e)}")

        # Test 2: Create budget item without subcategory (should work)
        try:
            budget_data = {
                "category": "Venue",
                "budgeted_amount": 500000,  # 5 lakhs INR
                "spent_amount": 100000,     # 1 lakh spent
                "notes": "Wedding hall booking",
                "is_custom": False
            }
            
            response = requests.post(f"{self.base_url}/budgets", json=budget_data)
            
            if response.status_code == 200:
                data = response.json()
                if ("subcategory" in data and data["subcategory"] == "" and 
                    data["category"] == "Venue" and data["budgeted_amount"] == 500000):
                    self.created_budget_ids.append(data["id"])
                    self.log_test("Create Budget without Subcategory", True, f"Created budget item with empty subcategory")
                else:
                    self.log_test("Create Budget without Subcategory", False, f"Subcategory field handling issue: {data}")
            else:
                self.log_test("Create Budget without Subcategory", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Create Budget without Subcategory", False, f"Exception: {str(e)}")

        # Test 3: Create multiple items in same category with different subcategories
        subcategory_items = [
            {"category": "Catering", "subcategory": "Sangeet Function", "budgeted_amount": 200000, "notes": "Sangeet dinner"},
            {"category": "Catering", "subcategory": "Wedding Day", "budgeted_amount": 800000, "notes": "Main wedding feast"},
            {"category": "Catering", "subcategory": "Mehendi Ceremony", "budgeted_amount": 150000, "notes": "Mehendi lunch"},
            {"category": "Attire", "subcategory": "Bride Lehenga", "budgeted_amount": 300000, "notes": "Designer bridal lehenga"},
            {"category": "Attire", "subcategory": "Father's Outfit", "budgeted_amount": 50000, "notes": "Father's kurta set"}
        ]
        
        for item in subcategory_items:
            try:
                response = requests.post(f"{self.base_url}/budgets", json=item)
                
                if response.status_code == 200:
                    data = response.json()
                    if ("subcategory" in data and data["subcategory"] == item["subcategory"]):
                        self.created_budget_ids.append(data["id"])
                        self.log_test(f"Create {item['category']} - {item['subcategory']}", True, f"Amount: ₹{item['budgeted_amount']:,}")
                    else:
                        self.log_test(f"Create {item['category']} - {item['subcategory']}", False, f"Subcategory mismatch: {data}")
                else:
                    self.log_test(f"Create {item['category']} - {item['subcategory']}", False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Create {item['category']} - {item['subcategory']}", False, f"Exception: {str(e)}")

    def test_budget_get_with_subcategories(self):
        """Test GET /api/budgets returns subcategory field"""
        try:
            response = requests.get(f"{self.base_url}/budgets")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check structure
                if ("items" in data and "total_budgeted" in data and 
                    "total_spent" in data and "remaining" in data):
                    
                    # Check if all items have subcategory field
                    all_have_subcategory = all("subcategory" in item for item in data["items"])
                    
                    if all_have_subcategory:
                        # Check budget summary calculations
                        calculated_budgeted = sum(item["budgeted_amount"] for item in data["items"])
                        calculated_spent = sum(item["spent_amount"] for item in data["items"])
                        calculated_remaining = calculated_budgeted - calculated_spent
                        
                        if (data["total_budgeted"] == calculated_budgeted and 
                            data["total_spent"] == calculated_spent and 
                            data["remaining"] == calculated_remaining):
                            
                            # Count items with subcategories
                            items_with_subcategories = sum(1 for item in data["items"] if item["subcategory"])
                            
                            self.log_test("GET Budgets with Subcategories", True, 
                                        f"Found {len(data['items'])} items, {items_with_subcategories} with subcategories. "
                                        f"Total: ₹{data['total_budgeted']:,}, Spent: ₹{data['total_spent']:,}, Remaining: ₹{data['remaining']:,}")
                        else:
                            self.log_test("GET Budgets with Subcategories", False, "Budget summary calculations incorrect")
                    else:
                        self.log_test("GET Budgets with Subcategories", False, "Not all items have subcategory field")
                else:
                    self.log_test("GET Budgets with Subcategories", False, f"Missing required fields in response: {data}")
            else:
                self.log_test("GET Budgets with Subcategories", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("GET Budgets with Subcategories", False, f"Exception: {str(e)}")

    def test_budget_update_subcategory(self):
        """Test updating subcategory field"""
        if not self.created_budget_ids:
            self.log_test("Update Budget Subcategory", False, "No budget items to update")
            return
            
        try:
            budget_id = self.created_budget_ids[0]
            update_data = {
                "category": "Attire",
                "subcategory": "Groom Sherwani - Premium",  # Updated subcategory
                "budgeted_amount": 200000,  # Updated amount
                "spent_amount": 50000,      # Some spent amount
                "notes": "Upgraded to premium designer sherwani",
                "is_custom": False
            }
            
            response = requests.put(f"{self.base_url}/budgets/{budget_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if (data["subcategory"] == "Groom Sherwani - Premium" and 
                    data["budgeted_amount"] == 200000 and 
                    data["spent_amount"] == 50000):
                    self.log_test("Update Budget Subcategory", True, f"Updated subcategory to: {data['subcategory']}")
                else:
                    self.log_test("Update Budget Subcategory", False, f"Update not reflected correctly: {data}")
            else:
                self.log_test("Update Budget Subcategory", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Update Budget Subcategory", False, f"Exception: {str(e)}")

    def test_tasks_api(self):
        """Test task APIs (should be unchanged)"""
        
        # Test 1: Create task
        try:
            task_data = {
                "title": "Book wedding photographer",
                "description": "Find and book photographer for all wedding events",
                "assigned_to": "Bride"
            }
            
            response = requests.post(f"{self.base_url}/tasks", json=task_data)
            
            if response.status_code == 200:
                data = response.json()
                if (data["title"] == task_data["title"] and 
                    data["assigned_to"] == task_data["assigned_to"] and 
                    data["completed"] == False):
                    self.created_task_ids.append(data["id"])
                    self.log_test("Create Task", True, f"Created task: {data['title']}")
                else:
                    self.log_test("Create Task", False, f"Task data incorrect: {data}")
            else:
                self.log_test("Create Task", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Create Task", False, f"Exception: {str(e)}")

        # Test 2: Get tasks
        try:
            response = requests.get(f"{self.base_url}/tasks")
            
            if response.status_code == 200:
                data = response.json()
                if ("tasks" in data and "total_tasks" in data and 
                    "completed_tasks" in data and "pending_tasks" in data):
                    self.log_test("GET Tasks", True, f"Found {data['total_tasks']} tasks, {data['completed_tasks']} completed")
                else:
                    self.log_test("GET Tasks", False, f"Missing required fields: {data}")
            else:
                self.log_test("GET Tasks", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("GET Tasks", False, f"Exception: {str(e)}")

        # Test 3: Toggle task completion
        if self.created_task_ids:
            try:
                task_id = self.created_task_ids[0]
                response = requests.patch(f"{self.base_url}/tasks/{task_id}/toggle")
                
                if response.status_code == 200:
                    data = response.json()
                    if data["completed"] == True:
                        self.log_test("Toggle Task Completion", True, f"Task marked as completed")
                    else:
                        self.log_test("Toggle Task Completion", False, f"Task completion not toggled: {data}")
                else:
                    self.log_test("Toggle Task Completion", False, f"Status: {response.status_code}, Response: {response.text}")
                    
            except Exception as e:
                self.log_test("Toggle Task Completion", False, f"Exception: {str(e)}")

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        
        # Test invalid budget ID
        try:
            response = requests.get(f"{self.base_url}/budgets/invalid_id")
            if response.status_code == 400:
                self.log_test("Invalid Budget ID Error Handling", True, "Correctly returned 400 for invalid ID")
            else:
                self.log_test("Invalid Budget ID Error Handling", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Invalid Budget ID Error Handling", False, f"Exception: {str(e)}")

        # Test missing required fields
        try:
            incomplete_budget = {"category": "Venue"}  # Missing budgeted_amount
            response = requests.post(f"{self.base_url}/budgets", json=incomplete_budget)
            if response.status_code == 422:
                self.log_test("Missing Required Fields Error Handling", True, "Correctly returned 422 for missing fields")
            else:
                self.log_test("Missing Required Fields Error Handling", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_test("Missing Required Fields Error Handling", False, f"Exception: {str(e)}")

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created budget items
        for budget_id in self.created_budget_ids:
            try:
                response = requests.delete(f"{self.base_url}/budgets/{budget_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted budget item: {budget_id}")
                else:
                    print(f"❌ Failed to delete budget item: {budget_id}")
            except Exception as e:
                print(f"❌ Error deleting budget item {budget_id}: {str(e)}")

        # Delete created task items
        for task_id in self.created_task_ids:
            try:
                response = requests.delete(f"{self.base_url}/tasks/{task_id}")
                if response.status_code == 200:
                    print(f"✅ Deleted task: {task_id}")
                else:
                    print(f"❌ Failed to delete task: {task_id}")
            except Exception as e:
                print(f"❌ Error deleting task {task_id}: {str(e)}")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Wedding Management App Backend Testing")
        print("🎯 Focus: Subcategory support for Indian wedding context")
        print(f"🌐 Backend URL: {self.base_url}")
        print("=" * 80)
        
        # Run tests in order
        self.test_budget_categories()
        self.test_budget_crud_with_subcategories()
        self.test_budget_get_with_subcategories()
        self.test_budget_update_subcategory()
        self.test_tasks_api()
        self.test_error_handling()
        
        # Summary
        print("=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
        
        # Cleanup
        self.cleanup_test_data()
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = WeddingAppTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)