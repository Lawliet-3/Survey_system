# google_speech_service_improved.py - Simplified version
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import os
import logging
import tempfile
import subprocess
import json
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
        if os.path.exists(file_path):
            os.unlink(file_path)
            logger.info(f"Temp file removed: {file_path}")
    except Exception as e:
        logger.error(f"Error removing temp file: {e}")

# Check if ffmpeg is installed
def is_ffmpeg_installed():
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5)
        return True
    except Exception:
        return False

# Convert audio to LINEAR16 format using ffmpeg - with timeout
def convert_audio_for_google(input_path, output_path):
    """Convert audio to format suitable for Google Speech API with timeout handling"""
    try:
        logger.info(f"Starting audio conversion: {input_path} → {output_path}")
        
        # Using ffmpeg to convert to LINEAR16 (signed 16-bit little-endian PCM)
        command = [
            "ffmpeg",
            "-i", input_path,            # Input file
            "-ar", "16000",              # Sample rate: 16kHz
            "-ac", "1",                  # Channels: mono
            "-f", "s16le",               # Format: signed 16-bit little-endian
            "-acodec", "pcm_s16le",      # Codec: PCM signed 16-bit little-endian
            "-y",                        # Overwrite output files without asking
            output_path                  # Output file
        ]
        
        # Run the command with a timeout
        process = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,  # Don't raise exception so we can log the error
            timeout=30    # Add a 30-second timeout to prevent hanging
        )
        
        if process.returncode != 0:
            logger.error(f"ffmpeg conversion failed (code {process.returncode}): {process.stderr}")
            return False, process.stderr
            
        # Check if output file was created and has content
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            logger.info(f"Conversion successful: Output size {os.path.getsize(output_path)} bytes")
            return True, "Conversion successful"
        else:
            logger.error("Output file is missing or empty")
            return False, "Output file is missing or empty"
        
    except subprocess.TimeoutExpired as e:
        logger.error(f"ffmpeg conversion timed out after {e.timeout} seconds")
        return False, f"Conversion timed out after {e.timeout} seconds"
    except Exception as e:
        logger.error(f"Error converting audio: {str(e)}")
        return False, str(e)

# Main transcription endpoint
# Replace the transcribe_audio endpoint in google_speech_service_improved.py

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = "th-TH"
):
    """
    Transcribe audio using Google Speech-to-Text, using a cleaner approach
    based on Google's reference implementation
    """
    logger.info(f"Received transcription request - File: {file.filename}, Language: {language}")
    
    try:
        # Create a unique request ID
        request_id = f"req_{uuid.uuid4().hex[:8]}"
        
        # Save uploaded file to temp directory
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            original_path = temp_file.name
            content = await file.read()
            temp_file.write(content)
            file_size = len(content)
            logger.info(f"Saved uploaded file ({file_size} bytes) to {original_path}")
        
        # Schedule cleanup of temp file
        background_tasks.add_task(remove_temp_file, original_path)
        
        # If file is very small, it might be empty or corrupted
        if file_size < 100:
            logger.warning(f"File is suspiciously small ({file_size} bytes)")
            return get_demo_transcription(request_id, language)
        
        # Create another temp file for converted audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as converted_file:
            converted_path = converted_file.name
            logger.info(f"Created output path for WAV: {converted_path}")
        
        # Schedule cleanup of converted file
        background_tasks.add_task(remove_temp_file, converted_path)
        
        # Convert to WAV with proper format for Google Speech API
        command = [
            "ffmpeg",
            "-i", original_path,         # Input file
            "-ar", "16000",              # Sample rate: 16kHz (required by Google)
            "-ac", "1",                  # Channels: mono (required by Google)
            "-acodec", "pcm_s16le",      # Codec: PCM signed 16-bit little-endian (LINEAR16)
            "-af", "volume=2.0",         # Boost volume to help speech detection
            "-f", "wav",                 # Output format: WAV
            "-y",                        # Overwrite output files without asking
            converted_path               # Output file
        ]
        
        # Run the conversion
        process = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=30
        )
        
        if process.returncode != 0:
            logger.error(f"Audio conversion failed: {process.stderr}")
            return get_demo_transcription(request_id, language)
        
        # Following Google's sample code more closely
        try:
            from google.cloud import speech
            from google.oauth2 import service_account
            
            # Set up credentials
            creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON", "")
            if not creds_json:
                logger.error("Google credentials not found in environment")
                return get_demo_transcription(request_id, language)
            
            # Create client
            creds_info = json.loads(creds_json)
            credentials = service_account.Credentials.from_service_account_info(creds_info)
            client = speech.SpeechClient(credentials=credentials)
            
            # Read audio file directly, matching Google's sample code
            with open(converted_path, "rb") as audio_file:
                audio_content = audio_file.read()
            
            # Create recognition audio from content
            audio = speech.RecognitionAudio(content=audio_content)
            
            # Create recognition config
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
                language_code=language,
                enable_automatic_punctuation=True,
                use_enhanced=True,
                model="default"
            )
            
            # Perform recognition
            logger.info(f"Sending recognition request to Google API for {request_id}")
            response = client.recognize(config=config, audio=audio)
            
            # Process all results, following Google's approach
            full_transcript = ""
            
            # Process each result (sequential segments of audio)
            for i, result in enumerate(response.results):
                # Get the top alternative for this segment
                if result.alternatives:
                    segment_transcript = result.alternatives[0].transcript
                    logger.info(f"Result {i+1}: {segment_transcript}")
                    full_transcript += segment_transcript + " "
            
            # Trim extra whitespace
            full_transcript = full_transcript.strip()
            
            if full_transcript:
                logger.info(f"Full transcription: '{full_transcript}'")
                return TranscriptionResponse(
                    id=request_id,
                    transcript=full_transcript,
                    language=language,
                    status="completed"
                )
            else:
                logger.warning("No speech detected")
                return get_demo_transcription(request_id, language)
                
        except Exception as e:
            logger.error(f"Error during speech recognition: {str(e)}")
            return get_demo_transcription(request_id, language)
                
    except Exception as e:
        logger.error(f"Unexpected error in transcription endpoint: {e}")
        return get_demo_transcription(request_id, language)

# Check server status endpoint
@router.get("/transcription-status")
async def transcription_status():
    """Check the status of the transcription service"""
    import os
    
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON", "")
    ffmpeg_installed = is_ffmpeg_installed()
    
    try:
        from google.cloud import speech
        speech_library_installed = True
    except ImportError:
        speech_library_installed = False
    
    # Test credential format (don't try to create client, just check format)
    creds_valid = False
    sample = ""
    
    if creds_json:
        try:
            if len(creds_json) > 50:  # Should be substantial in size
                if creds_json.startswith("{") and creds_json.endswith("}"):
                    json.loads(creds_json)  # Test if valid JSON
                    creds_valid = True
            
            # Add debug sample of beginning/end for troubleshooting
            if len(creds_json) > 20:
                sample = f"{creds_json[:10]}...{creds_json[-10:]}"
            else:
                sample = creds_json
                
        except json.JSONDecodeError:
            creds_valid = False
    
    return {
        "transcription_service": "available",
        "ffmpeg_installed": ffmpeg_installed,
        "google_credentials_available": bool(creds_json),
        "google_credentials_valid_format": creds_valid,
        "credentials_sample": sample,
        "speech_library_installed": speech_library_installed
    }

# Function to add these routes to the main FastAPI app
def setup_improved_speech_routes(app):
    """Register transcription routes with the main FastAPI app"""
    app.include_router(router, prefix="/api", tags=["speech"])

# Replace the get_demo_transcription function in google_speech_service_improved.py

def get_demo_transcription(request_id, language):
    """Generate a demo transcription for fallback when Google API fails"""
    # Choose a random demo transcription based on language
    import random
    
    if language == "th-TH":
        demo_transcriptions = [
            "นี่คือข้อความจากโปรแกรมจำลองเสียง",
            "สวัสดีค่ะ นี่คือข้อความที่สร้างขึ้นเพื่อทดสอบ",
            "ขอบคุณที่ใช้งานระบบของเรา",
            "โปรดตั้งค่า Google API ให้ถูกต้อง",
            "ตัวอย่างการตอบกลับแบบจำลอง"
        ]
    else:
        demo_transcriptions = [
            "This is a simulated transcription response.",
            "Hello, this is demo text for testing.",
            "Thank you for using our system.",
            "Please configure your Google API credentials correctly.",
            "This is an example fallback response."
        ]
    
    transcript = random.choice(demo_transcriptions)
    logger.info(f"Using demo transcription: {transcript}")
    
    response = TranscriptionResponse(
        id=request_id,
        transcript=transcript,
        language=language,
        status="demo"  # Mark this as a demo response
    )
    
    # Log the exact response being returned
    logger.info(f"Returning fallback response: {response.dict()}")
    
    return response

@router.get("/env-check")
async def check_environment():
    """Directly check environment variables"""
    import os
    import json
    
    # Check all environment variables (security note: in production, filter sensitive data)
    env_vars = dict(os.environ)
    
    # Check specifically for our Google credentials variable
    google_creds = os.getenv("GOOGLE_CREDENTIALS_JSON", "")
    
    # Format for display
    creds_info = {
        "exists": bool(google_creds),
        "length": len(google_creds),
        "first_chars": google_creds[:20] + "..." if len(google_creds) > 20 else google_creds,
        "is_json": False
    }
    
    # Try to validate as JSON
    if google_creds:
        try:
            json.loads(google_creds)
            creds_info["is_json"] = True
        except json.JSONDecodeError as e:
            creds_info["error"] = str(e)
    
    # Get file path information
    import sys
    path_info = {
        "current_directory": os.getcwd(),
        "python_path": sys.path,
        "env_file_exists": os.path.exists(".env"),
        "env_paths_checked": [
            {"path": ".env", "exists": os.path.exists(".env")},
            {"path": "../.env", "exists": os.path.exists("../.env")},
            {"path": "../../.env", "exists": os.path.exists("../../.env")},
        ]
    }
    
    # Return comprehensive information
    return {
        "google_credentials": creds_info,
        "paths": path_info,
        "message": "Make sure GOOGLE_CREDENTIALS_JSON is set properly in your environment"
    }

@router.post("/test-transcription")
async def test_transcription_directly(language: str = "th-TH"):
    """Force a test transcription response - no audio needed"""
    
    # Generate a test transcription
    request_id = f"test_{uuid.uuid4().hex[:8]}"
    
    response = get_demo_transcription(request_id, language)
    
    # Log the response for debugging
    logger.info(f"Test endpoint returning: {response.dict()}")
    
    return response