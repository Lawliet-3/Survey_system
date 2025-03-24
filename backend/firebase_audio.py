import datetime
import os
import logging
from fastapi import UploadFile
import firebase_admin
from firebase_admin import credentials, storage

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("firebase_audio")

class FirebaseAudioService:
    def __init__(self, service_account_path, bucket_name):
        """
        Initialize Firebase service for audio uploads
        
        Args:
            service_account_path: Path to the service account JSON file
            bucket_name: Name of the Firebase storage bucket
        """
        self.service_account_path = service_account_path
        self.bucket_name = bucket_name
        
        # Log path and bucket for debugging
        logger.info(f"Initializing Firebase with service account: {service_account_path}")
        logger.info(f"Using bucket: {bucket_name}")
        
        # Check if already initialized to avoid multiple initializations
        if not firebase_admin._apps:
            try:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred, {
                    'storageBucket': bucket_name
                })
                logger.info(f"Firebase initialized with bucket: {bucket_name}")
            except Exception as e:
                logger.error(f"Error initializing Firebase: {e}")
                raise
    
    async def upload_audio(self, file_obj: UploadFile, user_id: str = "anonymous", question_id: str = "unknown"):
        """
        Upload audio file to Firebase Storage and return the URL
        
        Args:
            file_obj: FastAPI UploadFile object
            user_id: Identifier for the user
            question_id: Identifier for the question
            
        Returns:
            str: URL to the uploaded file, or None if upload failed
        """
        try:
            # Create unique filename
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            destination = f"recordings/{user_id}_{question_id}_{timestamp}.wav"
            
            logger.info(f"Uploading file to Firebase: {destination}")
            logger.info(f"File content type: {file_obj.content_type}")
            
            # Get Firebase Storage bucket
            bucket = storage.bucket()
            blob = bucket.blob(destination)
            
            # Read the file content fully before uploading
            file_obj.file.seek(0)
            content = await file_obj.read()
            logger.info(f"Read {len(content)} bytes from file")
            
            # Use upload_from_string instead of upload_from_file
            logger.info("Using upload_from_string method")
            blob.upload_from_string(
                content,
                content_type=file_obj.content_type
            )
            logger.info("Upload successful")
            
            # Generate URL with 7-day expiration
            url = blob.generate_signed_url(
                version="v4",
                expiration=datetime.timedelta(days=7),
                method="GET"
            )
            
            logger.info(f"Generated signed URL: {url[:60]}...")
            return url
            
        except Exception as e:
            import traceback
            logger.error(f"Error uploading audio to Firebase: {e}")
            logger.error(traceback.format_exc())
            return None