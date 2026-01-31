"""
FocusFlow - Gamification Blueprint
Handles skill trees, loot system, collection, and projections.
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify

from models import ActivityLog, CategoryEnum, Item, UserItem
from utils import get_current_user
from gamification import check_chest_eligibility, open_chest, repair_item


# Create blueprint
gamification_bp = Blueprint('gamification', __name__)

# Session factory will be set by app.py
Session = None

def init_gamification_routes(session_factory):
    """Initialize the blueprint with the database session factory."""
    global Session
    Session = session_factory


# ============================================================================
# SKILL TREES
# ============================================================================

@gamification_bp.route('/api/skill-trees', methods=['GET'])
def get_skill_trees():
    """Get user's skill tree progress for all trees."""
    session = Session()
    try:
        user = get_current_user(session)
        
        from skill_trees import get_skill_tree_progress
        progress = get_skill_tree_progress(session, user.id)
        
        return jsonify({"skill_trees": progress})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@gamification_bp.route('/api/skill-trees/perks', methods=['GET'])
def get_unlocked_perks():
    """Get all perks the user has unlocked."""
    session = Session()
    try:
        user = get_current_user(session)
        
        from skill_trees import get_active_perks
        perks = get_active_perks(session, user.id)
        
        return jsonify({"perks": perks})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# LOOT BOX / COLLECTION SYSTEM
# ============================================================================

@gamification_bp.route('/api/user/chest_status', methods=['GET'])
def get_chest_status():
    """Check if user is eligible to open a loot chest."""
    session = Session()
    try:
        user = get_current_user(session)
        result = check_chest_eligibility(session, user)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@gamification_bp.route('/api/user/open_chest', methods=['POST'])
def open_loot_chest():
    """Open a loot chest using 1 credit."""
    session = Session()
    try:
        user = get_current_user(session)
        
        result = open_chest(session, user)
        
        if 'error' in result:
            status_code = 400 if result.get('credits_required') else 500
            return jsonify(result), status_code
        
        session.commit()
        
        return jsonify({
            "success": True,
            "credits_remaining": user.chest_credits or 0,
            **result
        }), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@gamification_bp.route('/api/user/collection', methods=['GET'])
def get_user_collection():
    """Get all items the user has collected."""
    session = Session()
    try:
        user = get_current_user(session)
        
        user_items = session.query(UserItem).filter(
            UserItem.user_id == user.id
        ).all()
        
        all_items = session.query(Item).all()
        all_items_dict = {item.id: item.to_dict() for item in all_items}
        
        owned_ids = {ui.item_id for ui in user_items}
        owned_items = [ui.to_dict() for ui in user_items]
        
        broken_count = sum(1 for ui in user_items if ui.is_broken)
        
        return jsonify({
            "owned_items": owned_items,
            "owned_count": len(owned_items),
            "broken_count": broken_count,
            "total_items": len(all_items),
            "chest_credits": user.chest_credits,
            "all_items": [
                {
                    **item.to_dict(),
                    "owned": item.id in owned_ids,
                    "count": next((ui.count for ui in user_items if ui.item_id == item.id), 0),
                    "is_broken": next((ui.is_broken for ui in user_items if ui.item_id == item.id), False)
                }
                for item in all_items
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@gamification_bp.route('/api/items/repair/<int:item_id>', methods=['POST'])
def repair_item_endpoint(item_id):
    """Repair a broken item by spending chest credits."""
    session = Session()
    try:
        user = get_current_user(session)
        result = repair_item(session, user, item_id)
        
        if result.get("success"):
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# LIFE PROJECTION
# ============================================================================

@gamification_bp.route('/api/projection', methods=['GET'])
def get_time_projection():
    """Calculate life projection based on leisure time habits."""
    session = Session()
    try:
        user = get_current_user(session)
        
        current_year = datetime.utcnow().year
        if user.birth_year:
            age = current_year - user.birth_year
        else:
            age = 25
        
        remaining_years = max(0, 80 - age)
        
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        leisure_activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= seven_days_ago,
            ActivityLog.category == CategoryEnum.LEISURE
        ).all()
        
        total_leisure_minutes = sum(a.duration_minutes or 30 for a in leisure_activities)
        avg_daily_leisure_minutes = total_leisure_minutes / 7
        avg_daily_leisure_hours = avg_daily_leisure_minutes / 60
        
        minutes_per_year = avg_daily_leisure_minutes * 365
        hours_per_year = minutes_per_year / 60
        years_on_leisure = (avg_daily_leisure_minutes * 365 * remaining_years) / (60 * 24 * 365)
        
        percent_of_life = (avg_daily_leisure_hours / 24) * 100
        
        today = datetime.utcnow().date()
        start_of_today = datetime.combine(today, datetime.min.time())
        
        todays_leisure = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= start_of_today,
            ActivityLog.category == CategoryEnum.LEISURE
        ).all()
        
        today_leisure_minutes = sum(a.duration_minutes or 30 for a in todays_leisure)
        today_leisure_hours = today_leisure_minutes / 60
        
        leisure_limit_hours = 1.0
        limit_exceeded = today_leisure_hours > leisure_limit_hours
        
        return jsonify({
            "age": age,
            "has_birth_year": user.birth_year is not None,
            "remaining_years": remaining_years,
            "avg_daily_leisure_hours": round(avg_daily_leisure_hours, 1),
            "hours_per_year": round(hours_per_year, 0),
            "years_on_leisure": round(years_on_leisure, 1),
            "percent_of_life": round(percent_of_life, 1),
            "today_leisure_hours": round(today_leisure_hours, 1),
            "leisure_limit_hours": leisure_limit_hours,
            "limit_exceeded": limit_exceeded,
            "warning_level": "critical" if years_on_leisure >= 5 else "warning" if years_on_leisure >= 2 else "info"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
