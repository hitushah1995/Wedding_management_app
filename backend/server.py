from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class BudgetItemCreate(BaseModel):
    category: str
    budgeted_amount: float
    spent_amount: float = 0.0
    notes: Optional[str] = ""
    is_custom: bool = False

class BudgetItem(BaseModel):
    id: str
    category: str
    budgeted_amount: float
    spent_amount: float
    notes: Optional[str] = ""
    is_custom: bool = False
    created_at: datetime

class BudgetSummary(BaseModel):
    total_budgeted: float
    total_spent: float
    remaining: float
    items: List[BudgetItem]

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    assigned_to: str

class Task(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    assigned_to: str
    completed: bool = False
    created_at: datetime
    updated_at: datetime

class TaskSummary(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    tasks: List[Task]

# Helper function to convert MongoDB document to dict
def budget_helper(budget) -> dict:
    return {
        "id": str(budget["_id"]),
        "category": budget["category"],
        "budgeted_amount": budget["budgeted_amount"],
        "spent_amount": budget["spent_amount"],
        "notes": budget.get("notes", ""),
        "is_custom": budget.get("is_custom", False),
        "created_at": budget["created_at"]
    }

def task_helper(task) -> dict:
    return {
        "id": str(task["_id"]),
        "title": task["title"],
        "description": task.get("description", ""),
        "assigned_to": task["assigned_to"],
        "completed": task["completed"],
        "created_at": task["created_at"],
        "updated_at": task["updated_at"]
    }

# Budget Routes
@api_router.get("/budgets", response_model=BudgetSummary)
async def get_budgets():
    budgets = await db.budgets.find().sort("created_at", 1).to_list(1000)
    items = [budget_helper(budget) for budget in budgets]
    
    total_budgeted = sum(item["budgeted_amount"] for item in items)
    total_spent = sum(item["spent_amount"] for item in items)
    remaining = total_budgeted - total_spent
    
    return {
        "total_budgeted": total_budgeted,
        "total_spent": total_spent,
        "remaining": remaining,
        "items": items
    }

@api_router.post("/budgets", response_model=BudgetItem)
async def create_budget(budget: BudgetItemCreate):
    budget_dict = budget.dict()
    budget_dict["created_at"] = datetime.utcnow()
    
    result = await db.budgets.insert_one(budget_dict)
    created_budget = await db.budgets.find_one({"_id": result.inserted_id})
    
    return budget_helper(created_budget)

@api_router.put("/budgets/{budget_id}", response_model=BudgetItem)
async def update_budget(budget_id: str, budget: BudgetItemCreate):
    try:
        obj_id = ObjectId(budget_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid budget ID")
    
    budget_dict = budget.dict()
    result = await db.budgets.update_one(
        {"_id": obj_id},
        {"$set": budget_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    updated_budget = await db.budgets.find_one({"_id": obj_id})
    return budget_helper(updated_budget)

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str):
    try:
        obj_id = ObjectId(budget_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid budget ID")
    
    result = await db.budgets.delete_one({"_id": obj_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return {"message": "Budget deleted successfully"}

# Task Routes
@api_router.get("/tasks", response_model=TaskSummary)
async def get_tasks():
    tasks = await db.tasks.find().sort("created_at", 1).to_list(1000)
    task_list = [task_helper(task) for task in tasks]
    
    total_tasks = len(task_list)
    completed_tasks = sum(1 for task in task_list if task["completed"])
    pending_tasks = total_tasks - completed_tasks
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "tasks": task_list
    }

@api_router.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate):
    task_dict = task.dict()
    task_dict["completed"] = False
    task_dict["created_at"] = datetime.utcnow()
    task_dict["updated_at"] = datetime.utcnow()
    
    result = await db.tasks.insert_one(task_dict)
    created_task = await db.tasks.find_one({"_id": result.inserted_id})
    
    return task_helper(created_task)

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task: TaskCreate):
    try:
        obj_id = ObjectId(task_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid task ID")
    
    task_dict = task.dict()
    task_dict["updated_at"] = datetime.utcnow()
    
    result = await db.tasks.update_one(
        {"_id": obj_id},
        {"$set": task_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_task = await db.tasks.find_one({"_id": obj_id})
    return task_helper(updated_task)

@api_router.patch("/tasks/{task_id}/toggle", response_model=Task)
async def toggle_task(task_id: str):
    try:
        obj_id = ObjectId(task_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid task ID")
    
    task = await db.tasks.find_one({"_id": obj_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    new_completed_status = not task["completed"]
    
    await db.tasks.update_one(
        {"_id": obj_id},
        {"$set": {"completed": new_completed_status, "updated_at": datetime.utcnow()}}
    )
    
    updated_task = await db.tasks.find_one({"_id": obj_id})
    return task_helper(updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    try:
        obj_id = ObjectId(task_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid task ID")
    
    result = await db.tasks.delete_one({"_id": obj_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}

# Get predefined budget categories
@api_router.get("/budget-categories")
async def get_budget_categories():
    return {
        "categories": [
            "Venue",
            "Catering",
            "Photography",
            "Decorations",
            "Attire",
            "Entertainment",
            "Invitations",
            "Flowers"
        ]
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
