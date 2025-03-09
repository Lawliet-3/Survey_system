from sqlalchemy.orm import Session
import uuid
import json
from datetime import datetime
from typing import List, Dict, Any
import logging
from fastapi.encoders import jsonable_encoder

import models, schemas

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Question CRUD operations
def get_questions(db: Session, skip: int = 0, limit: int = 100):
    logger.info("Fetching questions from database")
    return db.query(models.Question).order_by(models.Question.display_order).offset(skip).limit(limit).all()

def get_question(db: Session, question_id: str):
    logger.info(f"Fetching question with ID: {question_id}")
    return db.query(models.Question).filter(models.Question.id == question_id).first()

def create_question(db: Session, question: schemas.QuestionCreate):
    # Handle options and logic - convert to JSON string if needed
    options = question.options
    if options:
        options = json.dumps(jsonable_encoder(options))
        
    logic = question.logic
    if logic:
        logic = json.dumps(jsonable_encoder(logic))
    
    db_question = models.Question(
        id=question.id,
        question_type=question.questionType,  # Note the camelCase to snake_case mapping
        question_text=question.questionText,  # Note the camelCase to snake_case mapping
        question_subtext=question.questionSubtext,
        options=options,
        logic=logic,
        is_required=question.isRequired,
        display_order=getattr(question, 'displayOrder', 0),
        min_selections=getattr(question, 'minSelections', 0)  # Added this line

    )
    
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    
    return db_question

def update_question(db: Session, question_id: str, question: schemas.QuestionUpdate):
    logger.info(f"Updating question: {question_id}")
    try:
        db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
        if db_question:
            update_data = question.dict(exclude_unset=True)
            
            # Map schema field names to model field names
            field_mapping = {
                "questionType": "question_type",
                "questionText": "question_text",
                "questionSubtext": "question_subtext",
                "isRequired": "is_required",
                "minSelections": "min_selections"
            }
            
            # Handle special JSON fields
            if 'options' in update_data:
                db_question.options = json.dumps(update_data['options'])
                del update_data['options']
                
            if 'logic' in update_data:
                db_question.logic = json.dumps(update_data['logic'])
                del update_data['logic']
            
            # Update other fields
            for key, value in update_data.items():
                if key in field_mapping:
                    setattr(db_question, field_mapping[key], value)
            
            db.commit()
            db.refresh(db_question)
            logger.info(f"Question updated successfully: {question_id}")
            return db_question
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating question: {str(e)}")
        raise

def delete_question(db: Session, question_id: str):
    logger.info(f"Deleting question: {question_id}")
    try:
        db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
        if db_question:
            db.delete(db_question)
            db.commit()
            logger.info(f"Question deleted successfully: {question_id}")
            return True
        return False
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting question: {str(e)}")
        raise

def update_question_order(db: Session, question_orders: List[schemas.QuestionOrderItem]):
    """Update the display order of questions"""
    updated_questions = []
    
    for item in question_orders:
        question = db.query(models.Question).filter(models.Question.id == item.id).first()
        if question:
            question.display_order = item.displayOrder
            updated_questions.append(question)
    
    db.commit()
    return updated_questions

# Submission and Response CRUD operations
def create_submission(db: Session, submission: schemas.SubmissionCreate):
    logger.info("Creating new submission")
    try:
        # Create a unique ID for the submission
        submission_id = f"sub_{uuid.uuid4().hex[:10]}_{int(datetime.utcnow().timestamp())}"
        
        # Log the submission data
        logger.info(f"Submission ID: {submission_id}")
        logger.info(f"Answers: {submission.answers}")
        
        # Create the submission record
        db_submission = models.Submission(
            id=submission_id,
            timestamp=datetime.utcnow()
        )
        db.add(db_submission)
        db.commit()
        logger.info(f"Submission record created: {submission_id}")
        
        # Create individual responses for each question
        for question_id, answer in submission.answers.items():
            response_id = f"res_{uuid.uuid4().hex[:8]}"
            
            # Convert answer to JSON string if it's not already a string
            if not isinstance(answer, str):
                answer_json = json.dumps(answer)
            else:
                answer_json = answer
                
            logger.info(f"Creating response: {response_id} for question: {question_id}")
            logger.info(f"Answer data: {answer_json}")
            
            db_response = models.Response(
                id=response_id,
                question_id=question_id,
                submission_id=submission_id,
                answer_data=answer_json
            )
            db.add(db_response)
        
        # Commit all responses
        db.commit()
        logger.info("All responses committed successfully")
        
        # Refresh the submission to get the related responses
        db.refresh(db_submission)
        return db_submission
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating submission: {str(e)}")
        raise

def get_submissions(db: Session, skip: int = 0, limit: int = 100):
    logger.info("Fetching submissions")
    return db.query(models.Submission).order_by(models.Submission.timestamp.desc()).offset(skip).limit(limit).all()

def get_submission(db: Session, submission_id: str):
    logger.info(f"Fetching submission: {submission_id}")
    return db.query(models.Submission).filter(models.Submission.id == submission_id).first()

def format_submission_for_api(db_submission):
    """Format a submission with all its responses for API output"""
    logger.info(f"Formatting submission for API: {db_submission.id}")
    
    responses_dict = {}
    
    for response in db_submission.responses:
        # If answer_data is stored as a JSON string, parse it back
        if isinstance(response.answer_data, str):
            try:
                answer_data = json.loads(response.answer_data)
            except:
                # If it's not valid JSON, use it as is
                answer_data = response.answer_data
        else:
            answer_data = response.answer_data
            
        responses_dict[response.question_id] = answer_data
    
    return {
        "id": db_submission.id,
        "timestamp": db_submission.timestamp.isoformat(),
        "answers": responses_dict
    }