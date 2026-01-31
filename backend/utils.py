"""
FocusFlow - Shared Utilities
Common helper functions used across all route blueprints.
"""

from datetime import datetime, timedelta
from flask import g
from models import User, Goal, ActivityLog


def get_current_user(session, Session=None):
    """
    Get current authenticated user or demo user.
    
    Args:
        session: SQLAlchemy session for database queries
        Session: Session factory (optional, used to create new session if needed)
    
    Returns:
        User object for the current request
    """
    user_id = getattr(g, 'user_id', None)
    if user_id:
        return session.query(User).filter_by(id=user_id).first()
    return get_or_create_demo_user(session)


def get_or_create_demo_user(session):
    """
    Get or create a demo user for MVP testing.
    
    Args:
        session: SQLAlchemy session for database queries
    
    Returns:
        Demo User object
    """
    user = session.query(User).filter_by(email="demo@focusflow.app").first()
    if not user:
        user = User(
            email="demo@focusflow.app",
            name="Demo User",
            bio="Welcome to FocusFlow! This is a demo account.",
            is_public=True
        )
        session.add(user)
        session.commit()
    return user


def build_insight_context(session, user_id):
    """
    Build context for AI insights: active goals and recent Focus Session stats.
    Used by Coach and Oracle to personalize messages (e.g. "You're doing great on your Coding goal!").
    
    Returns:
        dict with keys: active_goals (list of {title, target_value, timeframe, category}),
                        focus_sessions_last_7_days (int),
                        focus_minutes_last_7_days (int)
    """
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    
    goals = session.query(Goal).filter(
        Goal.user_id == user_id
    ).all()
    active_goals = [
        {
            "title": goal.title or (goal.category.value if goal.category else "Goal"),
            "target_value": goal.target_value,
            "timeframe": goal.timeframe.value if goal.timeframe else "weekly",
            "category": goal.category.value if goal.category else None,
        }
        for goal in goals
    ]
    
    focus_activities = session.query(ActivityLog).filter(
        ActivityLog.user_id == user_id,
        ActivityLog.timestamp >= seven_days_ago,
        ActivityLog.is_focus_session == 1
    ).all()
    focus_sessions_last_7_days = len(focus_activities)
    focus_minutes_last_7_days = sum(a.duration_minutes or 30 for a in focus_activities)
    
    return {
        "active_goals": active_goals,
        "focus_sessions_last_7_days": focus_sessions_last_7_days,
        "focus_minutes_last_7_days": focus_minutes_last_7_days,
    }
