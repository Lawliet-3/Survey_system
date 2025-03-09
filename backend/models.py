from sqlalchemy import Boolean, Column, String, Integer, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

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
    answer_data = Column(JSON)  # Store answer as JSON
    
    # Relationships
    question = relationship("Question", back_populates="responses")
    submission = relationship("Submission", back_populates="responses")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    responses = relationship("Response", back_populates="submission")