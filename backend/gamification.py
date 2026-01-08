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
    
    # Check goal status for penalties/bonuses
    goal_result = check_goal_status(session, user, activity)
    
    return {
        **xp_result,
        "new_badges": new_badges,
        "goal_penalties": goal_result.get("penalties", []),
        "goal_bonuses": goal_result.get("bonuses", [])
    }


def check_goal_status(session: SQLSession, user, activity) -> Dict[str, Any]:
    """
    Check if activity pushes user over goal limits or helps complete goals.
    Apply point penalties for exceeding limits, bonuses for meeting goals.
    
    Returns:
        Dict with lists of penalties and bonuses applied
    """
    from models import Goal, ActivityLog, GoalTypeEnum, TimeframeEnum
    
    penalties = []
    bonuses = []
    
    # Get user's active goals
    goals = session.query(Goal).filter(Goal.user_id == user.id).all()
    
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    for goal in goals:
        # Determine timeframe start
        if goal.timeframe == TimeframeEnum.DAILY:
            start_date = today
        elif goal.timeframe == TimeframeEnum.WEEKLY:
            start_date = today - timedelta(days=today.weekday())
        else:  # Monthly
            start_date = today.replace(day=1)
        
        start_datetime = datetime.combine(start_date, datetime.min.time())
        
        # Get activities matching this goal
        if goal.title:
            # Smart matching by title
            title_lower = goal.title.lower()
            for prefix in ['limit ', 'reduce ', 'avoid ', 'stop ', 'less ', 'target ', 'achieve ']:
                if title_lower.startswith(prefix):
                    title_lower = title_lower[len(prefix):]
                    break
            
            all_category_activities = session.query(ActivityLog).filter(
                ActivityLog.user_id == user.id,
                ActivityLog.category == goal.category,
                ActivityLog.timestamp >= start_datetime
            ).all()
            
            activities = [
                a for a in all_category_activities
                if title_lower in a.activity_name.lower() or 
                   a.activity_name.lower() in title_lower or
                   any(word in a.activity_name.lower() for word in title_lower.split() if len(word) > 3)
            ]
        else:
            activities = session.query(ActivityLog).filter(
                ActivityLog.user_id == user.id,
                ActivityLog.category == goal.category,
                ActivityLog.timestamp >= start_datetime
            ).all()
        
        total_minutes = sum(a.duration_minutes or 30 for a in activities)
        hours_logged = total_minutes / 60
        
        is_limit_goal = goal.goal_type == GoalTypeEnum.LIMIT if goal.goal_type else False
        
        if is_limit_goal:
            # LIMIT GOAL: Penalize for going over
            if hours_logged > goal.target_value:
                hours_over = hours_logged - goal.target_value
                
                # Check if this is the first time exceeding (penalty for initial breach)
                # by checking if previous total (before this activity) was under limit
                prev_minutes = total_minutes - (activity.duration_minutes or 30)
                prev_hours = prev_minutes / 60
                
                if prev_hours <= goal.target_value:
                    # First breach: -50 points
                    penalty = -50
                    user.xp = max(0, user.xp + penalty)
                    penalties.append({
                        "goal_title": goal.title or f"Limit {goal.category.value}",
                        "points": penalty,
                        "reason": "Exceeded limit",
                        "hours_over": round(hours_over, 1)
                    })
                else:
                    # Continued over-limit: -10 points per 30 min over
                    new_penalty = -10
                    user.xp = max(0, user.xp + new_penalty)
                    penalties.append({
                        "goal_title": goal.title or f"Limit {goal.category.value}",
                        "points": new_penalty,
                        "reason": "Continued over limit",
                        "hours_over": round(hours_over, 1)
                    })
        else:
            # TARGET GOAL: Bonus for completion
            if hours_logged >= goal.target_value:
                # Check if this activity completed the goal
                prev_minutes = total_minutes - (activity.duration_minutes or 30)
                prev_hours = prev_minutes / 60
                
                if prev_hours < goal.target_value:
                    # Just completed: +25 points
                    bonus = 25
                    user.xp += bonus
                    bonuses.append({
                        "goal_title": goal.title or f"{goal.category.value} Goal",
                        "points": bonus,
                        "reason": "Goal completed!"
                    })
    
    if penalties or bonuses:
        session.commit()
    
    return {
        "penalties": penalties,
        "bonuses": bonuses
    }


# ============================================================================
# COLLECTIBLES / LOOT SYSTEM (Phase 4)
# ============================================================================

import random

# Item definitions - 20 items across 4 rarities (Tech Relic Theme)
# icon_name should match Lucide React component names
ITEM_DEFINITIONS = [
    # COMMON (8 items) - Basic Developer Tools
    {"name": "Code Snippet", "rarity": "Common", "icon_name": "FileCode", "description": "A reusable piece of wisdom. Copy-paste with pride."},
    {"name": "Coffee Cup", "rarity": "Common", "icon_name": "Coffee", "description": "The fuel that powers all great code."},
    {"name": "Bug Fix", "rarity": "Common", "icon_name": "Bug", "description": "A squashed bug. Frame it and celebrate."},
    {"name": "Terminal Line", "rarity": "Common", "icon_name": "Terminal", "description": "Command the machine. Feel the power."},
    {"name": "Git Commit", "rarity": "Common", "icon_name": "GitCommit", "description": "Proof that you actually did something today."},
    {"name": "Keyboard Key", "rarity": "Common", "icon_name": "Keyboard", "description": "A single key from a well-worn keyboard."},
    {"name": "Binary Fragment", "rarity": "Common", "icon_name": "Binary", "description": "01101000 01101001. It means something."},
    {"name": "Power Cable", "rarity": "Common", "icon_name": "Cable", "description": "Keep the electrons flowing."},
    
    # RARE (6 items) - Hardware Upgrades
    {"name": "RAM Stick", "rarity": "Rare", "icon_name": "MemoryStick", "description": "16GB of pure possibility. Chrome approves."},
    {"name": "Hard Drive", "rarity": "Rare", "icon_name": "HardDrive", "description": "1TB of untapped potential."},
    {"name": "Database Shard", "rarity": "Rare", "icon_name": "Database", "description": "A fragment of infinite knowledge."},
    {"name": "Wifi Signal", "rarity": "Rare", "icon_name": "Wifi", "description": "Full bars. Maximum productivity."},
    {"name": "Shield Protocol", "rarity": "Rare", "icon_name": "Shield", "description": "Protection from digital threats."},
    {"name": "Circuit Board", "rarity": "Rare", "icon_name": "CircuitBoard", "description": "The foundation of all technology."},
    
    # LEGENDARY (4 items) - Advanced Tech
    {"name": "GPU Core", "rarity": "Legendary", "icon_name": "Cpu", "description": "Raw computational power. Games fear it."},
    {"name": "Cloud Server", "rarity": "Legendary", "icon_name": "Cloud", "description": "Infinite scale. Zero maintenance."},
    {"name": "Blockchain Node", "rarity": "Legendary", "icon_name": "Boxes", "description": "Decentralized. Immutable. Mysterious."},
    {"name": "AI Model", "rarity": "Legendary", "icon_name": "Bot", "description": "Trained on millions of productive hours."},
    
    # MYTHIC (2 items) - Transcendent Tech
    {"name": "Quantum Core", "rarity": "Mythic", "icon_name": "Atom", "description": "Exists in all states until observed. Including 'done'."},
    {"name": "The Singularity", "rarity": "Mythic", "icon_name": "Sparkles", "description": "The moment when productivity becomes infinite."},
]

# Rarity weights for loot drops (CS:GO style)
RARITY_WEIGHTS = {
    "Common": 60,      # 60%
    "Rare": 25,        # 25%  
    "Legendary": 10,   # 10%
    "Mythic": 5,       # 5%
}


def seed_items(session: SQLSession):
    """Seed all item definitions into the database"""
    from models import Item, RarityEnum
    
    for item_def in ITEM_DEFINITIONS:
        existing = session.query(Item).filter_by(name=item_def["name"]).first()
        if existing:
            continue
        
        item = Item(
            name=item_def["name"],
            rarity=RarityEnum[item_def["rarity"].upper()],
            icon_name=item_def["icon_name"],
            description=item_def["description"]
        )
        session.add(item)
    
    session.commit()
    return len(ITEM_DEFINITIONS)


# Explicit ordered rarity list to ensure weight alignment  
RARITY_ORDER = ["Common", "Rare", "Legendary", "Mythic"]
RARITY_WEIGHT_LIST = [60, 25, 10, 5]  # Must match RARITY_ORDER


def get_random_rarity() -> str:
    """Get a random rarity based on weights using explicit ordering"""
    # Use random.choices with aligned lists for guaranteed correctness
    result = random.choices(RARITY_ORDER, weights=RARITY_WEIGHT_LIST, k=1)[0]
    return result


def open_chest(session: SQLSession, user) -> Dict[str, Any]:
    """
    Open a loot chest and award a random item to the user.
    Requires 1 chest credit.
    
    Args:
        session: Database session
        user: User model instance
        
    Returns:
        Dict with item info and whether it's a new item
    """
    from models import Item, UserItem, RarityEnum
    
    # Check if user has credits
    if (user.chest_credits or 0) <= 0:
        return {"error": "No keys available", "credits_required": True}
    
    # Deduct 1 credit
    user.chest_credits = (user.chest_credits or 0) - 1
    
    # Get random rarity
    rarity = get_random_rarity()
    rarity_enum = RarityEnum[rarity.upper()]
    
    # Get all items of that rarity
    items = session.query(Item).filter_by(rarity=rarity_enum).all()
    
    if not items:
        # Fallback to any item
        items = session.query(Item).all()
    
    if not items:
        # Refund credit if no items
        user.chest_credits = (user.chest_credits or 0) + 1
        return {"error": "No items available"}
    
    # Pick random item
    item = random.choice(items)
    
    # Check if user already has this item
    user_item = session.query(UserItem).filter_by(
        user_id=user.id,
        item_id=item.id
    ).first()
    
    is_new = user_item is None
    
    if user_item:
        # Increment count
        user_item.count += 1
    else:
        # Add new item to user's collection
        user_item = UserItem(
            user_id=user.id,
            item_id=item.id,
            count=1
        )
        session.add(user_item)
    
    session.commit()
    
    return {
        "item": item.to_dict(),
        "is_new": is_new,
        "count": user_item.count,
        "rarity": rarity
    }


def check_chest_eligibility(session: SQLSession, user) -> Dict[str, Any]:
    """
    Check if user is eligible to open a chest (>2 hours productive work today).
    
    Returns:
        Dict with eligibility status and productive hours
    """
    from models import ActivityLog, CategoryEnum
    
    # Get today's activities
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    
    activities = session.query(ActivityLog).filter(
        ActivityLog.user_id == user.id,
        ActivityLog.timestamp >= start_of_day
    ).all()
    
    # Count productive minutes (Career and Health categories)
    productive_minutes = 0
    for activity in activities:
        if activity.category in [CategoryEnum.CAREER, CategoryEnum.HEALTH]:
            productive_minutes += activity.duration_minutes or 30
    
    productive_hours = productive_minutes / 60
    eligible = productive_hours >= 2.0
    
    return {
        "eligible": eligible,
        "productive_hours": round(productive_hours, 1),
        "required_hours": 2.0,
        "remaining_hours": max(0, round(2.0 - productive_hours, 1))
    }


# ============================================================================
# ITEM DECAY SYSTEM (Loss Aversion)
# ============================================================================

def check_item_decay(session: SQLSession, user) -> Optional[Dict[str, Any]]:
    """
    Check if user has exceeded their gaming limit and break their rarest item.
    This creates loss aversion by punishing excessive leisure time.
    
    Args:
        session: Database session
        user: User model instance
        
    Returns:
        Dict with broken item info if decay occurred, None otherwise
    """
    from models import UserItem, Item, RarityEnum
    
    # Check if user has exceeded their gaming limit
    if user.today_gaming_minutes <= user.daily_gaming_allowance:
        return None
    
    # Rarity priority: Mythic > Legendary > Rare > Common
    rarity_priority = [RarityEnum.MYTHIC, RarityEnum.LEGENDARY, RarityEnum.RARE, RarityEnum.COMMON]
    
    # Find the rarest unbroken item
    for rarity in rarity_priority:
        user_item = session.query(UserItem).join(Item).filter(
            UserItem.user_id == user.id,
            UserItem.is_broken == False,
            Item.rarity == rarity
        ).first()
        
        if user_item:
            # Break this item
            user_item.is_broken = True
            session.commit()
            
            return {
                "broken": True,
                "item_id": user_item.id,
                "item_name": user_item.item.name,
                "item_emoji": user_item.item.image_emoji,
                "rarity": user_item.item.rarity.value,
                "message": f"⚠️ Limit Exceeded: Your {user_item.item.name} has broken!"
            }
    
    # No items to break
    return None


def repair_item(session: SQLSession, user, user_item_id: int) -> Dict[str, Any]:
    """
    Repair a broken item by spending chest credits.
    
    Args:
        session: Database session
        user: User model instance
        user_item_id: ID of the UserItem to repair
        
    Returns:
        Dict with repair result
    """
    from models import UserItem
    
    REPAIR_COST = 5  # Credits required to repair
    
    # Find the user's item
    user_item = session.query(UserItem).filter(
        UserItem.id == user_item_id,
        UserItem.user_id == user.id
    ).first()
    
    if not user_item:
        return {"error": "Item not found", "success": False}
    
    if not user_item.is_broken:
        return {"error": "Item is not broken", "success": False}
    
    if user.chest_credits < REPAIR_COST:
        return {
            "error": f"Not enough credits. Need {REPAIR_COST}, have {user.chest_credits}",
            "success": False,
            "cost": REPAIR_COST,
            "current_credits": user.chest_credits
        }
    
    # Spend credits and repair item
    user.chest_credits -= REPAIR_COST
    user_item.is_broken = False
    session.commit()
    
    return {
        "success": True,
        "item_name": user_item.item.name,
        "credits_spent": REPAIR_COST,
        "remaining_credits": user.chest_credits,
        "message": f"✨ {user_item.item.name} has been repaired!"
    }
