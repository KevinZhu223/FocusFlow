"""
FocusFlow - Gamification Engine
Handles XP calculation, leveling, and badge awarding
"""

import math
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session as SQLSession


# ============================================================================
# XP & LEVELING SYSTEM
# ============================================================================

def calculate_xp_gain(productivity_score: float) -> int:
    """
    Calculate XP gained from an activity.
    Formula: 10 productivity points = 1 XP (minimum 1 XP for positive activities)
    
    Args:
        productivity_score: The weighted productivity score from the activity
        
    Returns:
        XP gained (always >= 0)
    """
    if productivity_score <= 0:
        return 0
    return max(1, int(productivity_score / 10))


def calculate_level(xp: int) -> int:
    """
    Calculate user level from total XP.
    Formula: Level = floor(sqrt(XP) * 0.2) + 1
    
    This creates a curve where:
    - Level 2: 25 XP
    - Level 3: 100 XP
    - Level 5: 400 XP
    - Level 10: 2025 XP
    
    Args:
        xp: Total XP accumulated
        
    Returns:
        Current level (minimum 1)
    """
    if xp <= 0:
        return 1
    return int(math.sqrt(xp) * 0.2) + 1


def xp_for_level(level: int) -> int:
    """
    Calculate total XP required to reach a specific level.
    Inverse of calculate_level formula.
    
    Args:
        level: Target level
        
    Returns:
        Total XP required
    """
    if level <= 1:
        return 0
    return int(((level - 1) / 0.2) ** 2)


def get_level_progress(xp: int) -> Dict[str, Any]:
    """
    Get detailed level progress information.
    
    Args:
        xp: Current total XP
        
    Returns:
        Dict with level info, progress percentage, and XP needed
    """
    current_level = calculate_level(xp)
    current_level_xp = xp_for_level(current_level)
    next_level_xp = xp_for_level(current_level + 1)
    
    xp_in_level = xp - current_level_xp
    xp_needed = next_level_xp - current_level_xp
    progress = (xp_in_level / xp_needed * 100) if xp_needed > 0 else 100
    
    return {
        "level": current_level,
        "xp": xp,
        "xp_in_level": xp_in_level,
        "xp_for_next_level": xp_needed,
        "progress_percent": round(progress, 1),
        "next_level": current_level + 1
    }


def award_xp(session: SQLSession, user, xp_amount: int) -> Dict[str, Any]:
    """
    Award XP to a user and check for level up.
    
    Args:
        session: Database session
        user: User model instance
        xp_amount: Amount of XP to award
        
    Returns:
        Dict with XP awarded and level up info
    """
    old_level = user.level
    user.xp += xp_amount
    new_level = calculate_level(user.xp)
    
    leveled_up = new_level > old_level
    if leveled_up:
        user.level = new_level
    
    session.commit()
    
    return {
        "xp_awarded": xp_amount,
        "total_xp": user.xp,
        "old_level": old_level,
        "new_level": new_level,
        "leveled_up": leveled_up
    }


# ============================================================================
# BADGE SYSTEM
# ============================================================================

# Badge definitions with check functions
BADGE_DEFINITIONS = [
    {
        "name": "Night Owl",
        "description": "Logged an activity between 10 PM and 4 AM",
        "icon_name": "Moon"
    },
    {
        "name": "Early Bird",
        "description": "Logged an activity before 7 AM",
        "icon_name": "Sunrise"
    },
    {
        "name": "Weekend Warrior",
        "description": "Logged over 5 hours of activities on a weekend day",
        "icon_name": "Sword"
    },
    {
        "name": "Iron Streak",
        "description": "Logged activities for 7 consecutive days",
        "icon_name": "Flame"
    },
    {
        "name": "Centurion",
        "description": "Logged 100 total activities",
        "icon_name": "Trophy"
    },
    {
        "name": "First Steps",
        "description": "Logged your first activity",
        "icon_name": "Footprints"
    },
    {
        "name": "Focused Mind",
        "description": "Completed 10 focus sessions",
        "icon_name": "Brain"
    },
    {
        "name": "Career Champion",
        "description": "Logged 50 hours of Career activities",
        "icon_name": "Briefcase"
    },
    {
        "name": "Health Hero",
        "description": "Logged 30 hours of Health activities",
        "icon_name": "Heart"
    },
    {
        "name": "Social Butterfly",
        "description": "Logged 20 hours of Social activities",
        "icon_name": "Users"
    }
]


def check_night_owl(activity, user_activities: List, local_hour: int = None) -> bool:
    """Check if activity was logged between 10 PM and 4 AM (user's local time)"""
    # Use local_hour if provided, otherwise fall back to UTC timestamp
    hour = local_hour if local_hour is not None else activity.timestamp.hour
    return hour >= 22 or hour < 4


def check_early_bird(activity, user_activities: List, local_hour: int = None) -> bool:
    """Check if activity was logged before 7 AM (user's local time)"""
    hour = local_hour if local_hour is not None else activity.timestamp.hour
    return hour < 7


def check_weekend_warrior(activity, user_activities: List) -> bool:
    """Check if user logged >5 hours on a weekend day"""
    if activity.timestamp.weekday() not in [5, 6]:  # Saturday = 5, Sunday = 6
        return False
    
    # Get all activities from the same day
    activity_date = activity.timestamp.date()
    same_day_activities = [
        a for a in user_activities 
        if a.timestamp.date() == activity_date
    ]
    
    total_minutes = sum(a.duration_minutes or 30 for a in same_day_activities)
    return total_minutes >= 300  # 5 hours = 300 minutes


def check_iron_streak(activity, user_activities: List) -> bool:
    """Check if user has logged activities for 7 consecutive days"""
    if len(user_activities) < 7:
        return False
    
    # Get unique dates with activities
    dates_with_activities = set(a.timestamp.date() for a in user_activities)
    
    # Check for 7 consecutive days ending today
    today = datetime.utcnow().date()
    for i in range(7):
        check_date = today - timedelta(days=i)
        if check_date not in dates_with_activities:
            return False
    
    return True


def check_centurion(activity, user_activities: List) -> bool:
    """Check if user has logged 100 total activities"""
    return len(user_activities) >= 100


def check_first_steps(activity, user_activities: List) -> bool:
    """Check if this is the user's first activity"""
    return len(user_activities) == 1


def check_focused_mind(activity, user_activities: List) -> bool:
    """Check if user has completed 10 focus sessions"""
    focus_count = sum(1 for a in user_activities if a.is_focus_session)
    return focus_count >= 10


def check_career_champion(activity, user_activities: List) -> bool:
    """Check if user has logged 50 hours of Career activities"""
    from models import CategoryEnum
    career_activities = [a for a in user_activities if a.category == CategoryEnum.CAREER]
    total_minutes = sum(a.duration_minutes or 30 for a in career_activities)
    return total_minutes >= 3000  # 50 hours


def check_health_hero(activity, user_activities: List) -> bool:
    """Check if user has logged 30 hours of Health activities"""
    from models import CategoryEnum
    health_activities = [a for a in user_activities if a.category == CategoryEnum.HEALTH]
    total_minutes = sum(a.duration_minutes or 30 for a in health_activities)
    return total_minutes >= 1800  # 30 hours


def check_social_butterfly(activity, user_activities: List) -> bool:
    """Check if user has logged 20 hours of Social activities"""
    from models import CategoryEnum
    social_activities = [a for a in user_activities if a.category == CategoryEnum.SOCIAL]
    total_minutes = sum(a.duration_minutes or 30 for a in social_activities)
    return total_minutes >= 1200  # 20 hours


# Map badge names to check functions
BADGE_CHECKS = {
    "Night Owl": check_night_owl,
    "Early Bird": check_early_bird,
    "Weekend Warrior": check_weekend_warrior,
    "Iron Streak": check_iron_streak,
    "Centurion": check_centurion,
    "First Steps": check_first_steps,
    "Focused Mind": check_focused_mind,
    "Career Champion": check_career_champion,
    "Health Hero": check_health_hero,
    "Social Butterfly": check_social_butterfly
}


def check_and_award_badges(
    session: SQLSession, 
    user, 
    activity, 
    user_activities: List,
    local_hour: int = None
) -> List[Dict[str, Any]]:
    """
    Check all badge conditions and award any newly earned badges.
    
    Args:
        session: Database session
        user: User model instance
        activity: The newly logged activity
        user_activities: All of the user's activities (including the new one)
        local_hour: User's local hour (0-23) for timezone-aware badges
        
    Returns:
        List of newly awarded badges
    """
    from models import Badge, UserBadge
    
    # Get user's existing badges
    existing_badge_ids = set(ub.badge_id for ub in user.badges)
    
    # Get all badges from DB
    all_badges = session.query(Badge).all()
    badge_map = {b.name: b for b in all_badges}
    
    newly_awarded = []
    
    # Badges that need local_hour
    timezone_aware_badges = {"Night Owl", "Early Bird"}
    
    for badge_name, check_fn in BADGE_CHECKS.items():
        badge = badge_map.get(badge_name)
        if not badge:
            continue
            
        # Skip if already earned
        if badge.id in existing_badge_ids:
            continue
        
        # Check if badge condition is met
        try:
            # Pass local_hour for timezone-aware badges
            if badge_name in timezone_aware_badges:
                met = check_fn(activity, user_activities, local_hour)
            else:
                met = check_fn(activity, user_activities)
            
            if met:
                # Award the badge
                user_badge = UserBadge(
                    user_id=user.id,
                    badge_id=badge.id,
                    earned_at=datetime.utcnow()
                )
                session.add(user_badge)
                newly_awarded.append(badge.to_dict())
        except Exception as e:
            print(f"Error checking badge {badge_name}: {e}")
            continue
    
    if newly_awarded:
        session.commit()
    
    return newly_awarded


def process_activity_gamification(
    session: SQLSession,
    user,
    activity,
    user_activities: List,
    local_hour: int = None
) -> Dict[str, Any]:
    """
    Process all gamification for a new activity.
    
    Args:
        session: Database session
        user: User model instance
        activity: The newly logged activity
        user_activities: All user activities including the new one
        local_hour: User's local hour (0-23) for timezone-aware badges
        
    Returns:
        Dict with XP info and any new badges
    """
    # Calculate and award XP
    xp_gain = calculate_xp_gain(activity.productivity_score)
    xp_result = award_xp(session, user, xp_gain)
    
    # Check for new badges (pass local_hour for timezone-aware checks)
    new_badges = check_and_award_badges(session, user, activity, user_activities, local_hour)
    
    return {
        **xp_result,
        "new_badges": new_badges
    }
