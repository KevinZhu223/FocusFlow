"""
FocusFlow - RPG Skill Trees System
Phase 4: Category-based progression with unlockable perks
"""

from typing import Dict, List, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session as SQLSession

# ============================================================================
# SKILL TREE DEFINITIONS
# ============================================================================

# Each tree has 5 tiers, each tier requires cumulative XP
# Perks are unlocked at each tier

SKILL_TREES = {
    "tech": {
        "name": "Tech Mastery",
        "icon": "Code",
        "color": "#6366f1",  # Indigo
        "description": "Master the digital realm",
        "categories": ["Career"],  # Which activity categories contribute XP
        "tiers": [
            {
                "level": 1,
                "xp_required": 0,
                "name": "Novice Coder",
                "perk": "Code Snippet",
                "perk_description": "Unlock the Code Snippet collectible"
            },
            {
                "level": 2,
                "xp_required": 500,
                "name": "Junior Developer",
                "perk": "Syntax Highlight",
                "perk_description": "+5% XP on Career activities"
            },
            {
                "level": 3,
                "xp_required": 1500,
                "name": "Mid-Level Engineer",
                "perk": "Debug Mode",
                "perk_description": "Unlock Matrix-themed profile border"
            },
            {
                "level": 4,
                "xp_required": 3500,
                "name": "Senior Architect",
                "perk": "System Design",
                "perk_description": "+10% XP on Career activities"
            },
            {
                "level": 5,
                "xp_required": 7000,
                "name": "Tech Grandmaster",
                "perk": "The Algorithm",
                "perk_description": "Exclusive holographic Tech badge"
            }
        ]
    },
    "wellness": {
        "name": "Wellness Warrior",
        "icon": "Heart",
        "color": "#10b981",  # Emerald
        "description": "Strengthen body and mind",
        "categories": ["Health"],
        "tiers": [
            {
                "level": 1,
                "xp_required": 0,
                "name": "Health Curious",
                "perk": "First Steps",
                "perk_description": "Unlock the Water Bottle collectible"
            },
            {
                "level": 2,
                "xp_required": 500,
                "name": "Fitness Beginner",
                "perk": "Endurance I",
                "perk_description": "+5% XP on Health activities"
            },
            {
                "level": 3,
                "xp_required": 1500,
                "name": "Wellness Practitioner",
                "perk": "Mind-Body",
                "perk_description": "Unlock Nature-themed profile border"
            },
            {
                "level": 4,
                "xp_required": 3500,
                "name": "Health Champion",
                "perk": "Endurance II",
                "perk_description": "+10% XP on Health activities"
            },
            {
                "level": 5,
                "xp_required": 7000,
                "name": "Wellness Sage",
                "perk": "Vitality Master",
                "perk_description": "Exclusive holographic Wellness badge"
            }
        ]
    },
    "social": {
        "name": "Social Butterfly",
        "icon": "Users",
        "color": "#f59e0b",  # Amber
        "description": "Build meaningful connections",
        "categories": ["Social"],
        "tiers": [
            {
                "level": 1,
                "xp_required": 0,
                "name": "Introvert Awakening",
                "perk": "First Contact",
                "perk_description": "Unlock the Coffee Chat collectible"
            },
            {
                "level": 2,
                "xp_required": 500,
                "name": "Social Explorer",
                "perk": "Charisma I",
                "perk_description": "+5% XP on Social activities"
            },
            {
                "level": 3,
                "xp_required": 1500,
                "name": "Community Builder",
                "perk": "Network Effect",
                "perk_description": "Unlock Social-themed profile border"
            },
            {
                "level": 4,
                "xp_required": 3500,
                "name": "Social Leader",
                "perk": "Charisma II",
                "perk_description": "+10% XP on Social activities"
            },
            {
                "level": 5,
                "xp_required": 7000,
                "name": "Relationship Master",
                "perk": "Heart of Gold",
                "perk_description": "Exclusive holographic Social badge"
            }
        ]
    },
    "creative": {
        "name": "Creative Spark",
        "icon": "Palette",
        "color": "#8b5cf6",  # Violet
        "description": "Unleash your imagination",
        "categories": ["Leisure"],
        "tiers": [
            {
                "level": 1,
                "xp_required": 0,
                "name": "Dabbler",
                "perk": "Inspiration",
                "perk_description": "Unlock the Sketchbook collectible"
            },
            {
                "level": 2,
                "xp_required": 500,
                "name": "Hobbyist",
                "perk": "Flow State I",
                "perk_description": "+5% XP on Leisure activities"
            },
            {
                "level": 3,
                "xp_required": 1500,
                "name": "Creative Soul",
                "perk": "Artistic Vision",
                "perk_description": "Unlock Aesthetic-themed profile border"
            },
            {
                "level": 4,
                "xp_required": 3500,
                "name": "Artisan",
                "perk": "Flow State II",
                "perk_description": "+10% XP on Leisure activities"
            },
            {
                "level": 5,
                "xp_required": 7000,
                "name": "Creative Visionary",
                "perk": "Masterpiece",
                "perk_description": "Exclusive holographic Creative badge"
            }
        ]
    },
    "discipline": {
        "name": "Iron Discipline",
        "icon": "Shield",
        "color": "#64748b",  # Slate
        "description": "Master the mundane",
        "categories": ["Chores"],
        "tiers": [
            {
                "level": 1,
                "xp_required": 0,
                "name": "Task Aware",
                "perk": "Order",
                "perk_description": "Unlock the Checklist collectible"
            },
            {
                "level": 2,
                "xp_required": 500,
                "name": "Organized",
                "perk": "Efficiency I",
                "perk_description": "+5% XP on Chores activities"
            },
            {
                "level": 3,
                "xp_required": 1500,
                "name": "Life Manager",
                "perk": "Systems Thinking",
                "perk_description": "Unlock Minimalist-themed profile border"
            },
            {
                "level": 4,
                "xp_required": 3500,
                "name": "Productivity Expert",
                "perk": "Efficiency II",
                "perk_description": "+10% XP on Chores activities"
            },
            {
                "level": 5,
                "xp_required": 7000,
                "name": "Discipline Master",
                "perk": "Total Control",
                "perk_description": "Exclusive holographic Discipline badge"
            }
        ]
    }
}


def get_skill_tree_progress(session: SQLSession, user_id: int) -> Dict[str, Any]:
    """
    Calculate user's progress in all skill trees based on their activity history.
    
    Args:
        session: Database session
        user_id: User's ID
        
    Returns:
        Dict with progress for each skill tree
    """
    from models import ActivityLog, CategoryEnum
    
    # Get all user activities
    activities = session.query(ActivityLog).filter(
        ActivityLog.user_id == user_id
    ).all()
    
    # Calculate XP per category
    category_xp = {
        "Career": 0,
        "Health": 0,
        "Social": 0,
        "Leisure": 0,
        "Chores": 0
    }
    
    for activity in activities:
        if activity.category:
            cat_name = activity.category.value
            # XP = productivity score (positive activities only)
            if activity.productivity_score > 0:
                category_xp[cat_name] += int(activity.productivity_score)
    
    # Build progress for each tree
    result = {}
    for tree_id, tree in SKILL_TREES.items():
        # Sum XP from all contributing categories
        tree_xp = sum(category_xp.get(cat, 0) for cat in tree["categories"])
        
        # Determine current tier
        current_tier = tree["tiers"][0]
        next_tier = tree["tiers"][1] if len(tree["tiers"]) > 1 else None
        
        for i, tier in enumerate(tree["tiers"]):
            if tree_xp >= tier["xp_required"]:
                current_tier = tier
                next_tier = tree["tiers"][i + 1] if i + 1 < len(tree["tiers"]) else None
        
        # Calculate progress to next tier
        progress_percent = 100
        xp_to_next = 0
        if next_tier:
            xp_in_current = tree_xp - current_tier["xp_required"]
            xp_needed = next_tier["xp_required"] - current_tier["xp_required"]
            progress_percent = min(100, int((xp_in_current / xp_needed) * 100))
            xp_to_next = next_tier["xp_required"] - tree_xp
        
        result[tree_id] = {
            "tree_id": tree_id,
            "name": tree["name"],
            "icon": tree["icon"],
            "color": tree["color"],
            "description": tree["description"],
            "total_xp": tree_xp,
            "current_tier": current_tier,
            "next_tier": next_tier,
            "progress_percent": progress_percent,
            "xp_to_next": max(0, xp_to_next),
            "max_tier": current_tier["level"] == 5,
            "tiers": tree["tiers"]
        }
    
    return result


def get_active_perks(session: SQLSession, user_id: int) -> List[Dict[str, Any]]:
    """
    Get list of all perks the user has unlocked.
    
    Returns:
        List of unlocked perks with their effects
    """
    progress = get_skill_tree_progress(session, user_id)
    
    perks = []
    for tree_id, tree_progress in progress.items():
        tree = SKILL_TREES[tree_id]
        current_level = tree_progress["current_tier"]["level"]
        
        # All tiers up to current are unlocked
        for tier in tree["tiers"]:
            if tier["level"] <= current_level:
                perks.append({
                    "tree_id": tree_id,
                    "tree_name": tree["name"],
                    "tier_level": tier["level"],
                    "tier_name": tier["name"],
                    "perk": tier["perk"],
                    "perk_description": tier["perk_description"]
                })
    
    return perks


def calculate_xp_bonus(session: SQLSession, user_id: int, category: str) -> float:
    """
    Calculate XP bonus multiplier based on unlocked perks.
    
    Args:
        category: The activity category (e.g., "Career", "Health")
        
    Returns:
        Multiplier (e.g., 1.0 for no bonus, 1.1 for +10%)
    """
    perks = get_active_perks(session, user_id)
    
    bonus = 1.0
    category_to_tree = {
        "Career": "tech",
        "Health": "wellness",
        "Social": "social",
        "Leisure": "creative",
        "Chores": "discipline"
    }
    
    tree_id = category_to_tree.get(category)
    if not tree_id:
        return bonus
    
    for perk in perks:
        if perk["tree_id"] == tree_id:
            # Tier 2 gives +5%, Tier 4 gives +10%
            if perk["tier_level"] == 2:
                bonus += 0.05
            elif perk["tier_level"] == 4:
                bonus += 0.10
    
    return bonus
