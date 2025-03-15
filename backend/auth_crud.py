from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import models
from passlib.context import CryptContext
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie

from jose import JWTError, jwt
from typing import Optional

from models import Customer, AuthCredential, Purchase
from schemas import TokenData  
from auth_security import SECRET_KEY, ALGORITHM, verify_token

# Password handling
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    # For development with mock data only - NOT for production!
    if hashed_password.startswith('hashed_password_'):
        # Extract the number from the password format (hashed_password_1, hashed_password_2, etc.)
        expected_password = f"hashed_password_{plain_password}" if plain_password.isdigit() else hashed_password
        return plain_password == expected_password or hashed_password == expected_password
    
    # This branch would be used in production with real bcrypt hashes
    # return pwd_context.verify(plain_password, hashed_password)
    
    # For now, simple string comparison for mock data
    return plain_password == hashed_password

def get_password_hash(password):
    return pwd_context.hash(password)

# User authentication
def authenticate_user(db: Session, username: str, password: str):
    user = db.query(models.AuthCredential).filter(models.AuthCredential.username == username).first()
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    
    # Update last login time
    user.last_login = datetime.now()
    db.commit()
    
    return user

# Customer data operations
def get_customer_by_id(db: Session, customer_id: str):
    return db.query(models.Customer).filter(models.Customer.customer_id == customer_id).first()

def get_customer_by_username(db: Session, username: str):
    auth_user = db.query(models.AuthCredential).filter(models.AuthCredential.username == username).first()
    if not auth_user:
        return None
    
    return db.query(models.Customer).filter(models.Customer.customer_id == auth_user.customer_id).first()

def get_latest_purchase(db: Session, customer_id: str):
    return db.query(models.Purchase)\
            .filter(models.Purchase.customer_id == customer_id)\
            .order_by(models.Purchase.purchase_date.desc())\
            .first()

def get_customer_survey_data(db: Session, customer_id: str):
    """Get all required customer data for the survey"""
    customer = get_customer_by_id(db, customer_id)
    if not customer:
        return None
    
    latest_purchase = get_latest_purchase(db, customer_id)
    
    # Construct response data
    return {
        "customer_id": customer.customer_id,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "income_range": customer.income_range,
        "marital_status": customer.marital_status,
        "has_children": customer.has_children,
        "province": customer.province,
        "latest_purchase": {
            "purchase_id": latest_purchase.purchase_id,
            "brand": latest_purchase.brand,
            "product_type": latest_purchase.product_type,
            "product_name": latest_purchase.product_name,
            "purchase_date": latest_purchase.purchase_date,
            "amount": float(latest_purchase.amount),
            "store_location": latest_purchase.store_location
        } if latest_purchase else None
    }

# Admin functions - can be expanded as needed
def get_all_customers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Customer).offset(skip).limit(limit).all()

# User authentication
def authenticate_user(db: Session, username: str, password: str):
    user = db.query(AuthCredential).filter(AuthCredential.username == username).first()
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    
    return user

def verify_password(plain_password, hashed_password):
    
    return plain_password == hashed_password  # Replace with proper verification

def get_password_hash(password):
    
    return password  # Replace with proper hashing

def update_last_login(db: Session, username: str):
    user = db.query(AuthCredential).filter(AuthCredential.username == username).first()
    if user:
        user.last_login = datetime.now()
        db.commit()
        return True
    return False

def validate_refresh_token(refresh_token: str) -> Optional[TokenData]:
    """Validate a refresh token and return token data if valid"""
    try:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
        
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Check if it's actually a refresh token
        if not payload.get("refresh"):
            return None
            
        username: str = payload.get("sub")
        customer_id: str = payload.get("customer_id")
        
        if not username or not customer_id:
            return None
            
        return TokenData(username=username, customer_id=customer_id)
    except JWTError:
        return None

# Customer data operations
def get_customer_by_id(db: Session, customer_id: str):
    return db.query(Customer).filter(Customer.customer_id == customer_id).first()

def get_customer_by_username(db: Session, username: str):
    auth_user = db.query(AuthCredential).filter(AuthCredential.username == username).first()
    if not auth_user:
        return None
    
    return db.query(Customer).filter(Customer.customer_id == auth_user.customer_id).first()

def get_latest_purchase(db: Session, customer_id: str):
    return db.query(Purchase)\
            .filter(Purchase.customer_id == customer_id)\
            .order_by(Purchase.purchase_date.desc())\
            .first()

def get_customer_survey_data(db: Session, customer_id: str):
    """Get all required customer data for the survey"""
    customer = get_customer_by_id(db, customer_id)
    if not customer:
        return None
    
    latest_purchase = get_latest_purchase(db, customer_id)
    
    # Construct response data
    return {
        "customer_id": customer.customer_id,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "income_range": customer.income_range,
        "marital_status": customer.marital_status,
        "has_children": customer.has_children,
        "province": customer.province,
        "latest_purchase": {
            "purchase_id": latest_purchase.purchase_id,
            "brand": latest_purchase.brand,
            "product_type": latest_purchase.product_type,
            "product_name": latest_purchase.product_name,
            "purchase_date": latest_purchase.purchase_date,
            "amount": float(latest_purchase.amount),
            "store_location": latest_purchase.store_location
        } if latest_purchase else None
    }