from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Union, Any
from datetime import datetime
import json

# Option schemas
class OptionBase(BaseModel):
    value: str
    label: str

class Option(OptionBase):
    pass

# Logic rule schemas
class LogicRuleBase(BaseModel):
    condition: str  # equals, not_equals, contains
    value: str
    jumpToQuestion: str

class LogicRule(LogicRuleBase):
    pass

# Question schemas
class QuestionBase(BaseModel):
    questionType: str  # SA, MA, OE
    questionText: str
    questionSubtext: Optional[str] = None
    options: Optional[List[Option]] = None
    logic: Optional[List[LogicRule]] = None
    isRequired: Optional[bool] = True
    minSelections: Optional[int] = 0
    maxSelections: Optional[int] = 0


class QuestionCreate(QuestionBase):
    id: str
    displayOrder: Optional[int] = 0  # Added to match your model
    
class QuestionUpdate(QuestionBase):
    pass

class QuestionOrderItem(BaseModel):
    id: str
    displayOrder: int

class QuestionOrderUpdate(BaseModel):
    questions: List[QuestionOrderItem]

class Question(QuestionBase):
    id: str
    displayOrder: Optional[int] = 0  # Added to match your model
    
    class Config:
        from_attributes = True  # Updated from orm_mode = True for Pydantic v2
        populate_by_name = True  # Allow populating by attribute name regardless of alias
        
        # Map snake_case to camelCase
        alias_generator = lambda field_name: ''.join(
            word if i == 0 else word.capitalize() 
            for i, word in enumerate(field_name.split('_'))
        )
        
    # Custom method to handle conversion from SQLAlchemy model
    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        # If this is a SQLAlchemy model instance
        if hasattr(obj, '__table__'):
            # Create a dict with the right field names
            data = {
                "id": obj.id,
                "questionType": obj.question_type,
                "questionText": obj.question_text,
                "questionSubtext": obj.question_subtext,
                "isRequired": obj.is_required,
                "displayOrder": obj.display_order,
            }
            
            # Handle options field - convert from JSON string if needed
            options = obj.options
            if isinstance(options, str):
                options = json.loads(options)
            data["options"] = options
            
            # Handle logic field - convert from JSON string if needed
            logic = obj.logic
            if isinstance(logic, str):
                logic = json.loads(logic)
            data["logic"] = logic
            
            return super().model_validate(data, *args, **kwargs)
        
        # Default behavior for non-SQLAlchemy objects
        return super().model_validate(obj, *args, **kwargs)

# Response schemas
class ResponseBase(BaseModel):
    question_id: str
    answer_data: Any
    
class ResponseCreate(ResponseBase):
    pass

class Response(ResponseBase):
    id: str
    submission_id: str
    
    class Config:
        from_attributes = True  # Updated from orm_mode = True

# Submission schemas
class SubmissionCreate(BaseModel):
    answers: Dict[str, Any]  # question_id -> answer

class Submission(BaseModel):
    id: str
    timestamp: datetime
    responses: List[Response] = []
    
    class Config:
        from_attributes = True  # Updated from orm_mode = True

# User authentication schemas
class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    customer_id: Optional[str] = None

# Customer data schemas
class PurchaseBase(BaseModel):
    brand: str
    product_type: str
    product_name: Optional[str] = None
    purchase_date: datetime
    store_location: Optional[str] = None

class LatestPurchase(PurchaseBase):
    purchase_id: str
    amount: float

class CustomerSurveyData(BaseModel):
    customer_id: str
    first_name: str
    last_name: str
    income_range: Optional[str] = None
    marital_status: Optional[str] = None
    has_children: Optional[bool] = None
    province: str
    latest_purchase: Optional[LatestPurchase] = None
    role: Optional[str] = "user"
    
    class Config:
        from_attributes = True