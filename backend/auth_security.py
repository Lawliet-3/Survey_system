from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Cookie, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import auth_crud as crud
from schemas import TokenData

# JWT Configuration - Store these in environment variables in production
SECRET_KEY = "MdCqqsIB5eg5BiHszB5OUMbXTBalBWzfB1iHYCotlqs"  # Replace with an actual secure random key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # 30 minutes
REFRESH_TOKEN_EXPIRE_DAYS = 7     # 7 days

# OAuth2 password bearer for token validation
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="api/auth/token",
    auto_error=False  # Don't auto-raise errors to allow cookie fallback
)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, credentials_exception: HTTPException):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        customer_id: str = payload.get("customer_id")
        
        if username is None:
            raise credentials_exception
        
        token_data = TokenData(username=username, customer_id=customer_id)
        return token_data
    
    except JWTError:
        raise credentials_exception

async def get_token_from_request(
    request: Request,
    token_header: Optional[str] = Depends(oauth2_scheme),
    access_token: Optional[str] = Cookie(None)
):
    """Get token from various sources in order of preference:
    1. Authorization header
    2. Cookie
    """
    # First try Authorization header
    if token_header:
        return token_header
    
    # Then try cookie
    if access_token:
        return access_token
    
    # No token found
    return None

async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(get_token_from_request), 
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
    
    token_data = verify_token(token, credentials_exception)
    customer = crud.get_customer_by_username(db, token_data.username)
    
    if customer is None:
        raise credentials_exception
    
    return customer

# Optional: Dependency for routes that need an authenticated user
def get_current_active_user(current_user = Depends(get_current_user)):
    return current_user

def require_role(required_role: str):
    """Dependency to check for specific role"""
    def role_checker(current_user = Depends(get_current_active_user)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. {required_role} role required."
            )
        return current_user
    return role_checker