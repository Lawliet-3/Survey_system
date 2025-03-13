# debug_speech_service.py - Updated to return better test transcriptions
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import os
import logging
import tempfile
from pydantic import BaseModel
from typing import Optional
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router for transcription endpoints
router = APIRouter()

# Models for transcription responses
class TranscriptionResponse(BaseModel):
    id: str
    transcript: str
    language: Optional[str] = None
    status: str = "completed"

# Background task to clean up temporary files
def remove_temp_file(file_path: str):
    try:
        os.unlink(file_path)
        logger.info(f"Temp file removed: {file_path}")
    except Exception as e:
        logger.error(f"Error removing temp file: {e}")

# Simple test endpoint that returns simulated transcription
@router.post("/transcribe/test")
async def transcribe_audio_test(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = "th-TH"
):
    """
    Simple test endpoint that returns a simulated transcription
    """
    logger.info(f"Received test transcription request - File: {file.filename}, Language: {language}")
    
    try:
        # Save uploaded file to temp directory
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            temp_file_path = temp_file.name
            content = await file.read()
            temp_file.write(content)
            file_size = len(content)
        
        # Schedule cleanup of temp file
        background_tasks.add_task(remove_temp_file, temp_file_path)
        
        # Return a simulated transcription based on language
        if language == "th-TH":
            simulated_transcript = "นี่คือข้อความทดสอบการแปลงเสียงเป็นข้อความภาษาไทย"
        else:
            simulated_transcript = "This is a test transcription of speech to text."
        
        return {
            "id": f"test_{uuid.uuid4().hex[:8]}",
            "transcript": simulated_transcript,
            "language": language,
            "status": "completed"
        }
    except Exception as e:
        logger.error(f"Error in test transcription: {e}")
        return {
            "id": f"error_{uuid.uuid4().hex[:8]}",
            "transcript": f"Error: {str(e)}",
            "language": language,
            "status": "error"
        }

# Check if ffmpeg is installed
@router.get("/check-ffmpeg")
async def check_ffmpeg():
    """Check if ffmpeg is installed on the server"""
    import subprocess
    
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, timeout=5)
        
        if result.returncode == 0:
            return {
                "ffmpeg_installed": True,
                "version": result.stdout.split('\n')[0] if result.stdout else "Unknown version",
                "message": "ffmpeg is installed and available"
            }
        else:
            return {
                "ffmpeg_installed": False,
                "error": result.stderr,
                "message": "ffmpeg command returned an error"
            }
    except FileNotFoundError:
        return {
            "ffmpeg_installed": False,
            "message": "ffmpeg is not installed or not in the PATH"
        }
    except Exception as e:
        return {
            "ffmpeg_installed": False,
            "error": str(e),
            "message": "Error checking ffmpeg"
        }

# Credentials check endpoint
@router.get("/credentials-test")
async def test_credentials():
    """Test if Google credentials are properly loaded"""
    import os
    
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON", "")
    result = {
        "has_credentials_env": bool(creds_json),
        "credentials_length": len(creds_json) if creds_json else 0,
        "is_valid_json": False,
        "client_created": False,
        "error": None
    }
    
    try:
        if creds_json:
            import json
            # Try to parse the JSON
            json.loads(creds_json)
            result["is_valid_json"] = True
            
            try:
                from google.oauth2 import service_account
                from google.cloud import speech
                
                # Try to create credentials
                creds_dict = json.loads(creds_json)
                credentials = service_account.Credentials.from_service_account_info(creds_dict)
                
                # Try to create client
                client = speech.SpeechClient(credentials=credentials)
                result["client_created"] = True
            except ImportError:
                result["error"] = "Google Cloud libraries not installed"
            except Exception as e:
                result["error"] = str(e)
    except Exception as e:
        result["error"] = str(e)
    
    return result

# Function to add these routes to the main FastAPI app
def setup_debug_speech_routes(app):
    app.include_router(router, prefix="/api", tags=["debug"])