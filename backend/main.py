from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from typing import List, Dict
import uuid
import json

import crud, models, schemas
from database import engine, get_db
from db_migration import migrate_database

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.put("/api/admin/questions/order")
def admin_update_question_order(order_data: schemas.QuestionOrderUpdate, db: Session = Depends(get_db)):
    """Update the order of questions"""
    updated_questions = crud.update_question_order(db, order_data.questions)
    return [prepare_question_for_response(q) for q in updated_questions]

def prepare_question_for_response(db_question):
    """Convert SQLAlchemy Question model to Pydantic Question schema."""
    if db_question is None:
        return None
    
    # Handle options field
    options = db_question.options
    if options and isinstance(options, str):
        try:
            options = json.loads(options)
        except json.JSONDecodeError:
            options = []
    
    # Handle logic field
    logic = db_question.logic
    if logic and isinstance(logic, str):
        try:
            logic = json.loads(logic)
        except json.JSONDecodeError:
            logic = []
    
    min_selections = 0
    if hasattr(db_question, 'min_selections'):
        min_selections = db_question.min_selections
    
    # Create Pydantic model with explicit field mapping
    return schemas.Question(
        id=db_question.id,
        questionType=db_question.question_type,
        questionText=db_question.question_text,
        questionSubtext=db_question.question_subtext,
        options=options,
        logic=logic,
        isRequired=db_question.is_required,
        # Include displayOrder if it exists in your schema
        displayOrder=getattr(db_question, 'display_order', 0),
        minSelections=min_selections
    )

# Function to check if tables exist and create them if they don't
def init_db():
    inspector = inspect(engine)
    
    # Get list of existing tables
    existing_tables = inspector.get_table_names()
    
    # List of table names from our models
    model_tables = models.Base.metadata.tables.keys()
    
    # Create only tables that don't exist
    tables_to_create = []
    for table_name in model_tables:
        if table_name not in existing_tables:
            tables_to_create.append(models.Base.metadata.tables[table_name])
    
    if tables_to_create:
        # Create only the tables that don't exist
        models.Base.metadata.create_all(bind=engine, tables=tables_to_create)
        print(f"Created tables: {', '.join(t.name for t in tables_to_create)}")
        return f"Created tables: {', '.join(t.name for t in tables_to_create)}"
    else:
        print("All tables already exist")
        return "All tables already exist"

# Add an initialization endpoint to create tables
@app.post("/api/admin/init_db")
def initialize_database():
    """Initialize the database (create tables)"""
    try:
        result = init_db()
        return {"status": "success", "message": result}
    except Exception as e:
        print(f"Database initialization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database initialization failed: {str(e)}")

# Initialize database on startup (optional)
@app.on_event("startup")
async def startup_event():
    try:
        print("Starting database initialization...")
        init_db()
        
        # Run database migrations
        print("Running database migrations...")
        migrate_database(engine)
        
        print("Database initialization and migration completed")
    except Exception as e:
        print(f"Error during startup database initialization: {str(e)}")

@app.post("/api/admin/migrate_db")
def run_migration():
    """Run database migrations to apply schema changes"""
    try:
        result = migrate_database(engine)
        if result:
            return {"status": "success", "message": "Database migrations completed successfully"}
        else:
            return {"status": "error", "message": "Database migrations failed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration error: {str(e)}")

# API endpoints for regular users
@app.get("/api/questions", response_model=List[schemas.Question])
def get_questions(db: Session = Depends(get_db)):
    """Get all questions for the survey"""
    questions = crud.get_questions(db)
    # Process each question to ensure JSON fields are properly converted
    return [prepare_question_for_response(q) for q in questions]

@app.post("/api/submit")
def submit_survey(submission: schemas.SubmissionCreate, db: Session = Depends(get_db)):
    """Submit survey responses"""
    try:
        db_submission = crud.create_submission(db, submission)
        return {"status": "success", "submission_id": db_submission.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin API endpoints
@app.get("/api/admin/questions", response_model=List[schemas.Question])
def admin_get_questions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all questions for admin"""
    questions = crud.get_questions(db, skip=skip, limit=limit)
    # Process each question to ensure JSON fields are properly converted
    return [prepare_question_for_response(q) for q in questions]

@app.get("/api/admin/questions/{question_id}", response_model=schemas.Question)
def admin_get_question(question_id: str, db: Session = Depends(get_db)):
    """Get a specific question"""
    db_question = crud.get_question(db, question_id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return prepare_question_for_response(db_question)

@app.post("/api/admin/questions", response_model=schemas.Question)
def admin_create_question(question: schemas.QuestionCreate, db: Session = Depends(get_db)):
    """Create a new question"""
    # Check if ID already exists
    db_question = crud.get_question(db, question_id=question.id)
    if db_question:
        raise HTTPException(status_code=400, detail="Question ID already exists")
    
    new_question = crud.create_question(db=db, question=question)
    return prepare_question_for_response(new_question)

@app.put("/api/admin/questions/{question_id}", response_model=schemas.Question)
def admin_update_question(question_id: str, question: schemas.QuestionUpdate, db: Session = Depends(get_db)):
    """Update an existing question"""
    db_question = crud.update_question(db, question_id=question_id, question=question)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return prepare_question_for_response(db_question)

@app.delete("/api/admin/questions/{question_id}")
def admin_delete_question(question_id: str, db: Session = Depends(get_db)):
    """Delete a question"""
    success = crud.delete_question(db, question_id=question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"status": "success", "message": "Question deleted successfully"}

@app.put("/api/admin/questions/order")
def admin_update_question_order(questions: List[schemas.Question], db: Session = Depends(get_db)):
    """Update the order of questions"""
    updated_questions = crud.update_question_order(db, questions)
    return [prepare_question_for_response(q) for q in updated_questions]

@app.get("/api/admin/responses")
def admin_get_responses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all survey responses"""
    submissions = crud.get_submissions(db, skip=skip, limit=limit)
    
    # Format submissions for API output
    response_data = []
    for submission in submissions:
        response_data.append(crud.format_submission_for_api(submission))
    
    return response_data

@app.get("/api/admin/responses/{submission_id}")
def admin_get_response(submission_id: str, db: Session = Depends(get_db)):
    """Get a specific survey response"""
    submission = crud.get_submission(db, submission_id=submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Response not found")
    
    return crud.format_submission_for_api(submission)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)