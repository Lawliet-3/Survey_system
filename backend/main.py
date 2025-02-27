from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Union, Optional, Any
import json
import os
from datetime import datetime

# Models
class Option(BaseModel):
    value: str
    label: str

class LogicRule(BaseModel):
    condition: str  # equals, not_equals, contains
    value: str
    jumpToQuestion: str

class QuestionBase(BaseModel):
    questionType: str  # SA, MA, OE
    questionText: str
    questionSubtext: Optional[str] = None
    options: Optional[List[Option]] = None
    logic: Optional[List[LogicRule]] = None
    isRequired: Optional[bool] = True

class QuestionCreate(QuestionBase):
    id: str

class QuestionUpdate(QuestionBase):
    pass

class Question(QuestionBase):
    id: str

class SurveySubmission(BaseModel):
    answers: Dict[str, Union[str, List[str]]]

# App setup
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# File paths
QUESTIONS_FILE = "survey_data/questions.json"
RESPONSES_DIR = "survey_responses"

# Ensure directories exist
os.makedirs(os.path.dirname(QUESTIONS_FILE), exist_ok=True)
os.makedirs(RESPONSES_DIR, exist_ok=True)

# Load questions from file
def get_questions():
    if not os.path.exists(QUESTIONS_FILE):
        # Create with sample data if doesn't exist
        sample_questions = [
            {
                "id": "D1",
                "questionType": "SA",
                "questionText": "Please specify your monthly household income (Before tax)?",
                "questionSubtext": "กรุณาระบุรายได้ครัวเรือนของครอบครัวคุณ (ก่อนหักภาษี) ของครอบครัวคุณค่ะ?",
                "options": [
                    {"value": "1", "label": "14,999 บาท หรือน้อยกว่า"},
                    {"value": "2", "label": "15,000-19,999 บาท"},
                    {"value": "3", "label": "20,000-29,999 บาท"},
                    {"value": "4", "label": "30,000-39,999 บาท"},
                    {"value": "5", "label": "40,000-49,999 บาท"},
                    {"value": "6", "label": "50,000-59,999 บาท"},
                    {"value": "7", "label": "60,000 บาท หรือมากกว่า"}
                ],
                "isRequired": True
            },
            {
                "id": "D2a",
                "questionType": "SA",
                "questionText": "Please specify your marital status?",
                "questionSubtext": "กรุณาระบุสถานภาพสมรสของคุณค่ะ?",
                "options": [
                    {"value": "1", "label": "โสด (Single)"},
                    {"value": "2", "label": "สมรส (มีบุตร) (Married with kids)"},
                    {"value": "3", "label": "สมรส (ไม่มีบุตร) (Married without kids)"},
                    {"value": "4", "label": "ม่าย/ หย่าร้าง (มีบุตร) (Divorced/Widow with kids)"},
                    {"value": "5", "label": "ม่าย/ หย่าร้าง (ไม่มีบุตร) (Divorced/Widow without kids)"}
                ],
                "logic": [
                    {
                        "condition": "equals",
                        "value": "2",
                        "jumpToQuestion": "D2b"
                    },
                    {
                        "condition": "equals",
                        "value": "4",
                        "jumpToQuestion": "D2b"
                    }
                ],
                "isRequired": True
            },
            {
                "id": "D2b",
                "questionType": "SA",
                "questionText": "Do you make any purchase of apparels / clothing for your kid within the past 6 months?",
                "questionSubtext": "คุณได้มีการซื้อเสื้อผ้าให้บุตรของคุณใน 6 เดือนที่ผ่านมาหรือไม่คะ?",
                "options": [
                    {"value": "1", "label": "ใช่ (Yes)"},
                    {"value": "2", "label": "ไม่ใช่ (No)"}
                ],
                "isRequired": True
            }
        ]
        with open(QUESTIONS_FILE, 'w') as f:
            json.dump(sample_questions, f, indent=2)
        return sample_questions
    
    try:
        with open(QUESTIONS_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading questions: {e}")
        return []

# Save questions to file
def save_questions(questions):
    with open(QUESTIONS_FILE, 'w') as f:
        json.dump(questions, f, indent=2)

# Find question by ID
def find_question(id, questions):
    for i, question in enumerate(questions):
        if question["id"] == id:
            return i, question
    return -1, None

# API endpoints for regular users
@app.get("/api/questions")
def read_questions():
    questions = get_questions()
    return questions

@app.post("/api/submit")
def submit_survey(submission: SurveySubmission):
    try:
        # Generate a filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{RESPONSES_DIR}/response_{timestamp}.json"
        
        # Save the submission to a file
        with open(filename, 'w') as f:
            json.dump(submission.dict(), f, indent=2)
            
        return {"status": "success", "message": "Survey submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin API endpoints
@app.get("/api/admin/questions")
def admin_get_questions():
    return get_questions()

@app.get("/api/admin/questions/{question_id}")
def admin_get_question(question_id: str):
    questions = get_questions()
    _, question = find_question(question_id, questions)
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return question

@app.post("/api/admin/questions", response_model=Question)
def admin_create_question(question: QuestionCreate):
    questions = get_questions()
    
    # Check if ID already exists
    _, existing = find_question(question.id, questions)
    if existing:
        raise HTTPException(status_code=400, detail="Question ID already exists")
    
    # Add new question
    new_question = question.dict()
    questions.append(new_question)
    save_questions(questions)
    
    return new_question

@app.put("/api/admin/questions/{question_id}", response_model=Question)
def admin_update_question(question_id: str, question: QuestionUpdate):
    questions = get_questions()
    idx, existing = find_question(question_id, questions)
    
    if idx == -1:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Update question
    updated_question = question.dict(exclude_unset=True)
    updated_question["id"] = question_id
    
    questions[idx] = updated_question
    save_questions(questions)
    
    return updated_question

@app.delete("/api/admin/questions/{question_id}")
def admin_delete_question(question_id: str):
    questions = get_questions()
    idx, existing = find_question(question_id, questions)
    
    if idx == -1:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Remove question
    del questions[idx]
    save_questions(questions)
    
    return {"status": "success", "message": "Question deleted successfully"}

# Get all survey responses
@app.get("/api/admin/responses")
def admin_get_responses():
    responses = []
    
    try:
        for filename in os.listdir(RESPONSES_DIR):
            if filename.endswith('.json'):
                with open(os.path.join(RESPONSES_DIR, filename), 'r') as f:
                    response_data = json.load(f)
                    # Add filename as id
                    response_data["id"] = filename
                    responses.append(response_data)
                    
        return responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get specific survey response
@app.get("/api/admin/responses/{response_id}")
def admin_get_response(response_id: str):
    try:
        with open(os.path.join(RESPONSES_DIR, response_id), 'r') as f:
            response_data = json.load(f)
            return response_data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Response not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)