"""
FocusFlow - Database Models
SQLAlchemy models for the Smart Productivity Tracker
Phase 2: Added authentication support and source tracking
"""

from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

Base = declarative_base()


class CategoryEnum(PyEnum):
    """Activity categories for classification"""
    CAREER = "Career"
    HEALTH = "Health"
    LEISURE = "Leisure"
    CHORES = "Chores"
    SOCIAL = "Social"


class SourceEnum(PyEnum):
    """Source of activity data"""
    MANUAL = "manual"
    GOOGLE_CALENDAR = "google_calendar"
    APPLE_HEALTH = "apple_health"
    API = "api"


class User(Base):
    """User model for authentication and activity ownership"""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable for demo user
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship to activities
    activities = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ActivityLog(Base):
    """
    Activity log model for tracking user activities.
    Stores both raw input and parsed/analyzed data.
    """
    __tablename__ = 'activity_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    # Raw input from user
    raw_input = Column(String(1000), nullable=False)
    
    # Parsed/analyzed fields
    activity_name = Column(String(255), nullable=False)
    category = Column(Enum(CategoryEnum), nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    
    # Scores and analysis
    sentiment_score = Column(Float, nullable=True)  # Range: -1.0 to 1.0
    productivity_score = Column(Float, nullable=False)  # Changed to Float for weighted scoring
    
    # Focus/flow state detection
    is_focus_session = Column(Integer, default=0)  # 0 = False, 1 = True
    
    # Source tracking for future integrations
    source = Column(Enum(SourceEnum), default=SourceEnum.MANUAL, nullable=False)
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationship to user
    user = relationship("User", back_populates="activities")

    def __repr__(self):
        return f"<ActivityLog(id={self.id}, activity='{self.activity_name}', category={self.category.value})>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "raw_input": self.raw_input,
            "activity_name": self.activity_name,
            "category": self.category.value if self.category else None,
            "duration_minutes": self.duration_minutes,
            "sentiment_score": self.sentiment_score,
            "productivity_score": self.productivity_score,
            "is_focus_session": bool(self.is_focus_session),
            "source": self.source.value if self.source else "manual",
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }


def init_db(database_url: str):
    """
    Initialize the database connection and create tables.
    
    Args:
        database_url: PostgreSQL connection string
        
    Returns:
        tuple: (engine, Session class)
    """
    engine = create_engine(database_url, echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return engine, Session


def reset_db(database_url: str):
    """
    Drop all tables and recreate them.
    WARNING: This will delete all data!
    
    Args:
        database_url: PostgreSQL connection string
    """
    engine = create_engine(database_url, echo=True)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    print("Database reset complete!")
    return engine
