from sqlalchemy import Boolean, Column, String, Integer, ForeignKey, DateTime, JSON, Text, TIMESTAMP
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy.sql import func

from database import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, index=True)
    question_type = Column(String, nullable=False)  # SA, MA, OE
    question_text = Column(String, nullable=False)
    question_subtext = Column(String, nullable=True)
    options = Column(JSON, nullable=True)  # Store options as JSON
    logic = Column(JSON, nullable=True)  # Store logic rules as JSON
    is_required = Column(Boolean, default=True)
    display_order = Column(Integer)  # For ordering questions
    min_selections = Column(Integer, default=0)  # Minimum number of selections for MA questions

    # Relationships
    responses = relationship("Response", back_populates="question")

class Response(Base):
    __tablename__ = "responses"

    id = Column(String, primary_key=True, index=True)
    question_id = Column(String, ForeignKey("questions.id"))
    submission_id = Column(String, ForeignKey("submissions.id"))
    answer_data = Column(Text)  # Store answer as Text
    
    # Relationships
    question = relationship("Question", back_populates="responses")
    submission = relationship("Submission", back_populates="responses")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    responses = relationship("Response", back_populates="submission")

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String, unique=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String)
    province = Column(String, nullable=False)
    district = Column(String)
    income_range = Column(String)  # For D1 question
    marital_status = Column(String)  # For D2a question
    has_children = Column(Boolean)  # For D2b question
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationships
    auth_credentials = relationship("AuthCredential", back_populates="customer", uselist=False)
    purchases = relationship("Purchase", back_populates="customer")

class AuthCredential(Base):
    __tablename__ = "auth_credentials"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"))
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    last_login = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationship
    customer = relationship("Customer", back_populates="auth_credentials")

class Purchase(Base):
    __tablename__ = "purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(String, unique=True, nullable=False)
    customer_id = Column(String, ForeignKey("customers.customer_id"))
    brand = Column(String, nullable=False)
    product_type = Column(String, nullable=False)
    product_name = Column(String)
    purchase_date = Column(DateTime, nullable=False)
    amount = Column(String, nullable=False)
    store_location = Column(String)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Relationship
    customer = relationship("Customer", back_populates="purchases")