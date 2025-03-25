from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from typing import List, Dict
import uuid
import json, os
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from google_speech_service_improved import setup_improved_speech_routes
import datetime

import crud, models, schemas
from database import engine, get_db
from db_migration import migrate_database

from auth_routes import router as auth_router
from fastapi import APIRouter, UploadFile, File, Form
from firebase_audio import FirebaseAudioService
import logging

app = FastAPI()

router = APIRouter()

app.include_router(router)

setup_improved_speech_routes(app)

app.include_router(auth_router)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("firebase_upload")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://survey-web-33.web.app", "http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    import google.cloud.speech
    GOOGLE_SPEECH_AVAILABLE = True
except ImportError:
    GOOGLE_SPEECH_AVAILABLE = False
    print("WARNING: Google Cloud Speech libraries not installed. Speech-to-text features will be limited.")

def get_firebase_service():
    """
    Get a configured Firebase service with improved error handling and logging
    """
    import os
    import logging
    
    # Set up logging
    logger = logging.getLogger("firebase_service")
    logger.setLevel(logging.INFO)
    
    # Define potential paths for the service account file
    potential_paths = [
        "./service_accounts/survey-impower-firebase-adminsdk-fbsvc-061ea178c1.json",  # Original path
        "../service_accounts/survey-impower-firebase-adminsdk-fbsvc-061ea178c1.json", # One directory up
        "./service-accounts/survey-impower-firebase-adminsdk-fbsvc-061ea178c1.json",  # Alternative path with hyphen
        os.path.join(os.getcwd(), "service_accounts/survey-impower-firebase-adminsdk-fbsvc-061ea178c1.json"), # Absolute path
        os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "")  # From environment variable
    ]
    
    # Firebase bucket name
    bucket_name = os.environ.get("FIREBASE_BUCKET_NAME", "survey-impower.firebasestorage.app")
    
    # Try each path
    for path in potential_paths:
        if path and os.path.isfile(path):
            logger.info(f"Found service account file at: {path}")
            try:
                # Try to create the service
                from firebase_audio import FirebaseAudioService
                service = FirebaseAudioService(path, bucket_name)
                logger.info(f"Firebase service created successfully with bucket: {bucket_name}")
                return service
            except Exception as e:
                logger.error(f"Failed to create Firebase service with path {path}: {str(e)}")
    
    logger.error("No valid service account file found in any of the potential paths")
    logger.info(f"Current directory: {os.getcwd()}")
    
    # Check if service_accounts directory exists
    if os.path.isdir("./service_accounts"):
        logger.info("service_accounts directory exists, listing contents:")
        for file in os.listdir("./service_accounts"):
            logger.info(f"  - {file}")
    else:
        logger.warning("service_accounts directory does not exist")
        # Try to create it
        try:
            os.makedirs("./service_accounts", exist_ok=True)
            logger.info("Created service_accounts directory")
        except Exception as dir_error:
            logger.error(f"Failed to create service_accounts directory: {str(dir_error)}")
    
    # Return a dummy service that will log errors but not crash
    from firebase_audio import FirebaseAudioService
    logger.warning("Using dummy Firebase service. Uploads will fail but application will continue.")
    
    dummy_path = "./service_accounts/dummy.json"
    # Create a minimal dummy file to avoid crashing
    if not os.path.exists(dummy_path):
        try:
            import json
            with open(dummy_path, 'w') as f:
                json.dump({"dummy": True}, f)
            logger.info("Created dummy service account file")
        except Exception as write_error:
            logger.error(f"Failed to create dummy file: {str(write_error)}")
    
    return FirebaseAudioService(dummy_path, bucket_name)

@app.get("/api/firebase-test")
async def firebase_direct_test():
    """Test Firebase upload directly with a dummy file"""
    try:
        # Create a simple test file
        test_content = b"This is a test file"
        filename = f"test_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        # Get Firebase service
        firebase_service = get_firebase_service()
        
        # Get bucket and create blob
        from firebase_admin import storage
        bucket = storage.bucket()
        blob = bucket.blob(f"test/{filename}")
        
        # Upload directly
        blob.upload_from_string(test_content, content_type="text/plain")
        
        # Generate URL
        url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(days=1),
            method="GET"
        )
        
        return {
            "success": True,
            "message": "Direct upload successful",
            "url": url,
            "path": f"test/{filename}"
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@app.post("/api/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    question_id: str = Form(...),
    user_id: str = Form("anonymous"),
):
    """Upload audio file to Firebase Storage and return the URL"""

    print("=" * 50)
    print(f"AUDIO UPLOAD ATTEMPT for {question_id} from {user_id}")
    print(f"Content type: {file.content_type}, Size: {file.size} bytes")
    print("=" * 50)

    try:
        print(f"Received audio upload request for question {question_id} from {user_id}")
        print(f"File content type: {file.content_type}")
        
        # Get Firebase service with error handling
        try:
            firebase_service = get_firebase_service()
            print("Firebase service initialized successfully")
        except Exception as firebase_init_error:
            error_details = str(firebase_init_error)
            print(f"Firebase initialization error: {error_details}")
            return {"success": False, "error": f"Firebase initialization error: {error_details}"}
        
        # Upload to Firebase with detailed error handling
        try:
            url = await firebase_service.upload_audio(file, user_id, question_id)
            if url:
                print(f"Upload successful: {url[:60]}...")
                return {"success": True, "url": url}
            else:
                print("Upload failed - no URL returned")
                return {"success": False, "error": "Upload failed - no URL returned"}
        except Exception as upload_error:
            error_details = str(upload_error)
            print(f"Firebase upload error: {error_details}")
            return {"success": False, "error": f"Firebase upload error: {error_details}"}
            
    except Exception as e:
        error_details = str(e)
        print(f"Unexpected error in upload endpoint: {error_details}")
        return {"success": False, "error": f"Server error: {error_details}"}

@router.get("/test-firebase")  # Note: no /api prefix for simplicity
async def test_firebase_connection():
    """Simple endpoint to test Firebase configuration"""
    try:
        # Check if service account file exists
        service_account_path = "./service_accounts/survey-impower-firebase-adminsdk-fbsvc-061ea178c1.json"
        file_exists = os.path.isfile(service_account_path)
        
        # Try to read the file to verify it's valid JSON
        file_content = None
        if file_exists:
            try:
                with open(service_account_path, 'r') as f:
                    file_content = json.load(f)
                    # Mask the private key for security
                    if "private_key" in file_content:
                        file_content["private_key"] = "***MASKED***"
            except json.JSONDecodeError:
                file_content = "File exists but is not valid JSON"
            except Exception as e:
                file_content = f"Error reading file: {str(e)}"
        
        # Return diagnostic information
        return {
            "status": "diagnostic_info",
            "service_account_path": service_account_path,
            "file_exists": file_exists,
            "file_content_sample": file_content,
            "current_directory": os.getcwd(),
            "directory_contents": os.listdir("./service_accounts") if os.path.isdir("./service_accounts") else "service_accounts directory not found"
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }

@app.get("/api/check-routes")
def check_routes():
    """Check if all required routes are registered"""
    routes = [{"path": route.path, "name": route.name} for route in app.routes]
    return {
        "registered_routes": routes,
        "improved_speech_route_found": any("/api/transcribe/google-improved" in route.path for route in app.routes),
        "test_speech_route_found": any("/api/transcribe/test" in route.path for route in app.routes)
    }

@app.get("/api/credentials-format")
async def credentials_format():
    """Show the correct format for Google credentials"""
    return {
        "note": "Google credentials should be set in the GOOGLE_CREDENTIALS_JSON environment variable",
        "format": "GOOGLE_CREDENTIALS_JSON={\"type\":\"service_account\",\"project_id\":\"your-project\",\"private_key_id\":\"...\",...}",
        "common_mistakes": [
            "Including quotes around the JSON in the .env file",
            "Not using the complete JSON from the service account key file",
            "Escaping quotes within the JSON incorrectly"
        ],
        "tip": "Format the credentials as a single line in the .env file without surrounding quotes"
    }
    
class ThaiJSONResponse(JSONResponse):
    def render(self, content):
        # Use ensure_ascii=False to properly handle Thai characters
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")

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
        minSelections=min_selections,
        maxSelections=db_question.max_selections
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
    processed_questions = [prepare_question_for_response(q) for q in questions]
    return ThaiJSONResponse(content=jsonable_encoder(processed_questions))

@app.post("/api/submit")
def submit_survey(submission: schemas.SubmissionCreate, db: Session = Depends(get_db)):
    """Submit survey responses"""
    try:
        db_submission = crud.create_submission(db, submission)
        return ThaiJSONResponse(content={"status": "success", "submission_id": db_submission.id})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin API endpoints
@app.get("/api/admin/questions", response_model=List[schemas.Question])
def admin_get_questions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all questions for admin"""
    questions = crud.get_questions(db, skip=skip, limit=limit)
    # Process each question to ensure JSON fields are properly converted
    processed_questions = [prepare_question_for_response(q) for q in questions]
    return ThaiJSONResponse(content=jsonable_encoder(processed_questions))

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
    
    return ThaiJSONResponse(content=response_data)

@app.get("/api/admin/responses/{submission_id}")
def admin_get_response(submission_id: str, db: Session = Depends(get_db)):
    """Get a specific survey response"""
    submission = crud.get_submission(db, submission_id=submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Response not found")
    
    return ThaiJSONResponse(content=crud.format_submission_for_api(submission))

@app.get("/health")
def direct_health_check():
    """Direct health check endpoint without API prefix for easier testing"""
    return {"status": "healthy", "message": "Service is running normally"}

# More comprehensive root endpoint with API info
@app.get("/")
def root_endpoint():
    """Root endpoint with API information"""
    return {
        "service": "Survey API",
        "status": "running",
        "version": "1.0",
        "endpoints": {
            "health": ["/health", "/api/health"],
            "questions": "/api/questions",
            "admin": "/api/admin/questions",
            "docs": "/docs"  # FastAPI auto-generated Swagger docs
        },
        "note": "All API endpoints use the /api prefix"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)