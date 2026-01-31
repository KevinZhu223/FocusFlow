"""
FocusFlow - Database Models
SQLAlchemy models for the Smart Productivity Tracker
Phase 3: Added gamification (XP, Levels, Badges), Goals, and Social features
"""

from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean, Text
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


class TimeframeEnum(PyEnum):
    """Goal timeframes"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class GoalTypeEnum(PyEnum):
    """Types of goals"""
    TARGET = "target"  # Achieve at least X hours (default)
    LIMIT = "limit"    # Stay under X hours


class RarityEnum(PyEnum):
    """Rarity levels for collectible items"""
    COMMON = "Common"
    RARE = "Rare"
    LEGENDARY = "Legendary"
    MYTHIC = "Mythic"


class FriendshipStatusEnum(PyEnum):
    """Status of a friendship request"""
    PENDING = "pending"
    ACCEPTED = "accepted"


class User(Base):
    """User model with authentication, gamification, and social features"""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable for demo user
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Profile fields (Phase 3)
    bio = Column(Text, nullable=True)
    avatar_color = Column(String(20), default="#6366f1")  # Default indigo
    
    # Social/Leaderboard (Phase 3)
    is_public = Column(Boolean, default=False)
    
    # Gamification (Phase 3)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    
    # Watcher/Intervention (Phase 4)
    daily_gaming_allowance = Column(Integer, default=60)  # Minutes allowed per day
    today_gaming_minutes = Column(Integer, default=0)  # Minutes used today
    last_gaming_reset = Column(DateTime, nullable=True)  # When gaming minutes were last reset
    
    # Loot Credits (Phase 4.5)
    chest_credits = Column(Integer, default=0)  # Credits earned from productive work
    productive_minutes = Column(Integer, default=0)  # Cumulative productive minutes toward next key
    
    # Age for projection analytics (Phase 6)
    birth_year = Column(Integer, nullable=True)  # User's birth year

    # Relationships
    activities = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    badges = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")
    items = relationship("UserItem", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}', level={self.level})>"

    def to_dict(self, include_private=True):
        data = {
            "id": self.id,
            "name": self.name,
            "level": self.level,
            "avatar_color": self.avatar_color or "#6366f1",
        }
        if include_private:
            data.update({
                "email": self.email,
                "bio": self.bio,
                "is_public": self.is_public,
                "xp": self.xp,
                "created_at": self.created_at.isoformat() if self.created_at else None,
                "daily_gaming_allowance": self.daily_gaming_allowance,
                "today_gaming_minutes": self.today_gaming_minutes,
                "chest_credits": self.chest_credits or 0
            })
        return data


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
    category = Column(Enum(CategoryEnum), nullable=False, index=True)  # Index for Dashboard/Analytics filtering
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


class Goal(Base):
    """User goals for category-based time tracking"""
    __tablename__ = 'goals'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    title = Column(String(255), nullable=True)  # Custom goal name
    category = Column(Enum(CategoryEnum), nullable=True)  # Optional - LLM can auto-categorize
    target_value = Column(Integer, nullable=False)  # Target hours
    timeframe = Column(Enum(TimeframeEnum), nullable=False)
    goal_type = Column(Enum(GoalTypeEnum), default=GoalTypeEnum.TARGET, nullable=False)  # target or limit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("User", back_populates="goals")

    def __repr__(self):
        return f"<Goal(id={self.id}, title='{self.title}', type={self.goal_type.value}, target={self.target_value}h/{self.timeframe.value})>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "category": self.category.value if self.category else None,
            "target_value": self.target_value,
            "timeframe": self.timeframe.value if self.timeframe else None,
            "goal_type": self.goal_type.value if self.goal_type else "target",
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Badge(Base):
    """Achievement badges that users can earn"""
    __tablename__ = 'badges'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(500), nullable=False)
    icon_name = Column(String(50), nullable=False)  # Lucide icon name

    # Relationship
    user_badges = relationship("UserBadge", back_populates="badge")

    def __repr__(self):
        return f"<Badge(id={self.id}, name='{self.name}')>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon_name": self.icon_name
        }


class UserBadge(Base):
    """Junction table linking users to earned badges"""
    __tablename__ = 'user_badges'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    badge_id = Column(Integer, ForeignKey('badges.id'), nullable=False, index=True)
    earned_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="badges")
    badge = relationship("Badge", back_populates="user_badges")

    def __repr__(self):
        return f"<UserBadge(user_id={self.user_id}, badge_id={self.badge_id})>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "badge_id": self.badge_id,
            "badge": self.badge.to_dict() if self.badge else None,
            "earned_at": self.earned_at.isoformat() if self.earned_at else None
        }


class Item(Base):
    """Collectible items that users can earn from loot boxes"""
    __tablename__ = 'items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    rarity = Column(Enum(RarityEnum), nullable=False)
    icon_name = Column(String(50), nullable=False)  # Lucide React icon name
    description = Column(String(500), nullable=False)

    # Relationship
    user_items = relationship("UserItem", back_populates="item")

    def __repr__(self):
        return f"<Item(id={self.id}, name='{self.name}', rarity={self.rarity.value})>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "rarity": self.rarity.value if self.rarity else None,
            "icon_name": self.icon_name,
            "description": self.description
        }


class UserItem(Base):
    """Junction table linking users to collected items with count"""
    __tablename__ = 'user_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey('items.id'), nullable=False, index=True)
    count = Column(Integer, default=1)  # How many of this item user has
    first_obtained_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_broken = Column(Boolean, default=False)  # Item decay: broken items can't be used

    # Relationships
    user = relationship("User", back_populates="items")
    item = relationship("Item", back_populates="user_items")

    def __repr__(self):
        return f"<UserItem(user_id={self.user_id}, item_id={self.item_id}, count={self.count})>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "item_id": self.item_id,
            "item": self.item.to_dict() if self.item else None,
            "count": self.count,
            "is_broken": self.is_broken,
            "first_obtained_at": self.first_obtained_at.isoformat() if self.first_obtained_at else None
        }


class Friendship(Base):
    """Friendship model for tracking friend relationships"""
    __tablename__ = 'friendships'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)  # Requester
    friend_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)  # Receiver
    status = Column(Enum(FriendshipStatusEnum), default=FriendshipStatusEnum.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    requester = relationship("User", foreign_keys=[user_id], backref="sent_requests")
    receiver = relationship("User", foreign_keys=[friend_id], backref="received_requests")

    def __repr__(self):
        return f"<Friendship(user_id={self.user_id}, friend_id={self.friend_id}, status={self.status})>"

    def to_dict(self, include_user=False, include_friend=False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "friend_id": self.friend_id,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
        if include_user and self.requester:
            data["requester"] = self.requester.to_dict(include_private=False)
        if include_friend and self.receiver:
            data["receiver"] = self.receiver.to_dict(include_private=False)
        return data


class ChallengeStatusEnum(PyEnum):
    """Status of a challenge"""
    PENDING = "pending"     # Waiting for opponent to accept
    ACTIVE = "active"       # Challenge is in progress
    COMPLETED = "completed" # Challenge ended
    DECLINED = "declined"   # Opponent declined


class Challenge(Base):
    """Challenge model for friend challenges"""
    __tablename__ = 'challenges'

    id = Column(Integer, primary_key=True, autoincrement=True)
    creator_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    opponent_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    # Challenge details
    title = Column(String(255), nullable=False)
    category = Column(Enum(CategoryEnum), nullable=True)  # Optional - can be all categories
    target_hours = Column(Integer, nullable=False, default=5)  # Target hours to log
    timeframe = Column(Enum(TimeframeEnum), default=TimeframeEnum.WEEKLY, nullable=False)
    
    # Status and timing
    status = Column(Enum(ChallengeStatusEnum), default=ChallengeStatusEnum.PENDING, nullable=False)
    start_date = Column(DateTime, nullable=True)  # Set when accepted
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Scores
    creator_score = Column(Float, default=0)
    opponent_score = Column(Float, default=0)
    winner_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Relationships
    creator = relationship("User", foreign_keys=[creator_id], backref="created_challenges")
    opponent = relationship("User", foreign_keys=[opponent_id], backref="received_challenges")
    winner = relationship("User", foreign_keys=[winner_id])

    def __repr__(self):
        return f"<Challenge(id={self.id}, title='{self.title}', status={self.status})>"

    def to_dict(self, include_users=False):
        data = {
            "id": self.id,
            "creator_id": self.creator_id,
            "opponent_id": self.opponent_id,
            "title": self.title,
            "category": self.category.value if self.category else None,
            "target_hours": self.target_hours,
            "timeframe": self.timeframe.value if self.timeframe else "weekly",
            "status": self.status.value,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "creator_score": self.creator_score or 0,
            "opponent_score": self.opponent_score or 0,
            "winner_id": self.winner_id
        }
        if include_users:
            data["creator"] = self.creator.to_dict(include_private=False) if self.creator else None
            data["opponent"] = self.opponent.to_dict(include_private=False) if self.opponent else None
            data["winner"] = self.winner.to_dict(include_private=False) if self.winner else None
        return data


class Season(Base):
    """Season model for global competitive seasons"""
    __tablename__ = 'seasons'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)  # e.g., "January Jumpstart"
    description = Column(String(500), nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Badge reward for top performers
    top_badge_id = Column(Integer, ForeignKey('badges.id'), nullable=True)

    def __repr__(self):
        return f"<Season(id={self.id}, name='{self.name}', active={self.is_active})>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "is_active": self.is_active,
            "top_badge_id": self.top_badge_id
        }


class SeasonScore(Base):
    """Track user scores for each season"""
    __tablename__ = 'season_scores'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    season_id = Column(Integer, ForeignKey('seasons.id'), nullable=False, index=True)
    score = Column(Float, default=0, nullable=False)
    rank = Column(Integer, nullable=True)  # Final rank at season end
    activities_count = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="season_scores")
    season = relationship("Season", backref="scores")

    def __repr__(self):
        return f"<SeasonScore(user={self.user_id}, season={self.season_id}, score={self.score})>"

    def to_dict(self, include_user=False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "season_id": self.season_id,
            "score": self.score,
            "rank": self.rank,
            "activities_count": self.activities_count
        }
        if include_user and self.user:
            data["user"] = self.user.to_dict(include_private=False)
        return data


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
