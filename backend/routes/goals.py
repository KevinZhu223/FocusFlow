"""
FocusFlow - Goals Blueprint
Handles goals CRUD operations with progress tracking.
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify

from models import Goal, ActivityLog, CategoryEnum, TimeframeEnum, GoalTypeEnum
from utils import get_current_user
from schemas import goal_schema
from errors import handle_validation_error, api_error_response


# Create blueprint
goals_bp = Blueprint('goals', __name__)

# Session factory will be set by app.py
Session = None

def init_goals_routes(session_factory):
    """Initialize the blueprint with the database session factory."""
    global Session
    Session = session_factory


# ============================================================================
# GOALS CRUD
# ============================================================================

@goals_bp.route('/api/goals', methods=['GET'])
def get_goals():
    """Get all goals for the current user with progress."""
    session = Session()
    try:
        user = get_current_user(session)
        
        goals = session.query(Goal).filter(Goal.user_id == user.id).all()
        
        # Get timezone offset from frontend (in minutes, e.g., -300 for EST)
        tz_offset = request.args.get('tz_offset', type=int, default=0)
        
        goals_with_progress = []
        for goal in goals:
            # Calculate user's local date using their timezone offset
            now_utc = datetime.utcnow()
            user_local_datetime = now_utc - timedelta(minutes=tz_offset)
            today = user_local_datetime.date()
            
            if goal.timeframe == TimeframeEnum.DAILY:
                start_date = today
                total_days = 1
                days_passed = 1
            elif goal.timeframe == TimeframeEnum.WEEKLY:
                start_date = today - timedelta(days=today.weekday())
                total_days = 7
                days_passed = max(1, today.weekday() + 1)
            else:  # Monthly
                start_date = today.replace(day=1)
                days_passed = today.day
                if today.month == 12:
                    total_days = 31
                else:
                    next_month = user_local_datetime.replace(day=28) + timedelta(days=4)
                    total_days = (next_month - timedelta(days=next_month.day)).day
            
            # Convert start_date back to UTC for database query
            start_datetime_local = datetime.combine(start_date, datetime.min.time())
            start_datetime_utc = start_datetime_local + timedelta(minutes=tz_offset)
            
            # Get activities for this goal
            if goal.title:
                title_lower = goal.title.lower()
                for prefix in ['limit ', 'reduce ', 'avoid ', 'stop ', 'less ', 'target ', 'achieve ']:
                    if title_lower.startswith(prefix):
                        title_lower = title_lower[len(prefix):]
                        break
                
                all_category_activities = session.query(ActivityLog).filter(
                    ActivityLog.user_id == user.id,
                    ActivityLog.category == goal.category,
                    ActivityLog.timestamp >= start_datetime_utc
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
                    ActivityLog.timestamp >= start_datetime_utc
                ).all()
            
            # Calculate hours logged
            total_minutes = sum(a.duration_minutes or 30 for a in activities)
            hours_logged = round(total_minutes / 60, 1)
            
            # Get goal type
            goal_type = goal.goal_type.value if goal.goal_type else "target"
            is_limit_goal = goal_type == "limit"
            
            # Calculate progress and status
            if is_limit_goal:
                progress_percent = round((hours_logged / goal.target_value) * 100, 1)
                budget_remaining = max(0, round(goal.target_value - hours_logged, 1))
                
                if hours_logged <= goal.target_value * 0.5:
                    pacing_status = "on_track"
                elif hours_logged <= goal.target_value * 0.8:
                    pacing_status = "slightly_behind"
                elif hours_logged <= goal.target_value:
                    pacing_status = "at_risk"
                else:
                    pacing_status = "over_limit"
                    
                expected_hours = None
                expected_percent = None
            else:
                progress_percent = min(100, round((hours_logged / goal.target_value) * 100, 1))
                expected_hours = round((goal.target_value / total_days) * days_passed, 1)
                expected_percent = min(100, round((expected_hours / goal.target_value) * 100, 1))
                budget_remaining = None
                
                if progress_percent >= 100:
                    pacing_status = "complete"
                elif hours_logged >= expected_hours:
                    pacing_status = "on_track"
                elif hours_logged >= expected_hours * 0.7:
                    pacing_status = "slightly_behind"
                elif days_passed < 4 and progress_percent < 10:
                    pacing_status = "not_started"
                elif days_passed >= 4 and progress_percent < 50:
                    pacing_status = "at_risk"
                else:
                    pacing_status = "slightly_behind"
            
            goal_data = goal.to_dict()
            goal_data["hours_logged"] = hours_logged
            goal_data["progress_percent"] = progress_percent
            goal_data["expected_hours"] = expected_hours
            goal_data["expected_percent"] = expected_percent
            goal_data["budget_remaining"] = budget_remaining
            goal_data["days_passed"] = days_passed
            goal_data["total_days"] = total_days
            goal_data["status"] = pacing_status
            goals_with_progress.append(goal_data)
        
        return jsonify({"goals": goals_with_progress})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@goals_bp.route('/api/goals', methods=['POST'])
@handle_validation_error
def create_goal():
    """Create a new goal with optional custom title and goal type."""
    data = request.get_json()
    if not data:
        return api_error_response("VALIDATION_ERROR", "Missing request body", status_code=400)
    loaded = goal_schema.load(data)
    
    timeframe = TimeframeEnum(loaded['timeframe'])
    goal_type = GoalTypeEnum(loaded['goal_type'])
    title = (loaded.get('title') or '').strip()[:255] or None
    
    category = None
    if loaded.get('category'):
        try:
            category = CategoryEnum(loaded['category'])
        except ValueError:
            pass
    
    if not category and title:
        try:
            category = categorize_goal_with_llm(title, goal_type.value)
        except Exception as e:
            print(f"LLM categorization failed: {e}")
            category = CategoryEnum.LEISURE if goal_type == GoalTypeEnum.LIMIT else CategoryEnum.CAREER
    elif not category:
        category = CategoryEnum.LEISURE if goal_type == GoalTypeEnum.LIMIT else CategoryEnum.CAREER
    
    session = Session()
    try:
        user = get_current_user(session)
        
        goal = Goal(
            user_id=user.id,
            title=title,
            category=category,
            target_value=int(loaded['target_value']),
            timeframe=timeframe,
            goal_type=goal_type
        )
        session.add(goal)
        session.commit()
        
        return jsonify({
            "success": True,
            "goal": goal.to_dict()
        }), 201
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


def categorize_goal_with_llm(title: str, goal_type: str) -> CategoryEnum:
    """Use LLM to categorize a goal based on its title."""
    prompt = f"""Categorize this goal into exactly one category.

Goal: "{title}"
Goal Type: {goal_type} ({"achieve at least X hours" if goal_type == "target" else "stay under X hours"})

Categories:
- Career: Work, study, learning, professional development
- Health: Exercise, gym, meditation, sleep, nutrition
- Leisure: Gaming, entertainment, social media, TV, hobbies
- Chores: Household tasks, errands, cleaning, maintenance
- Social: Time with friends, family, community

Reply with ONLY the category name (Career, Health, Leisure, Chores, or Social)."""

    try:
        import google.generativeai as genai
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        category_text = response.text.strip().title()
        
        for cat in CategoryEnum:
            if cat.value in category_text or category_text in cat.value:
                return cat
        
        return CategoryEnum.LEISURE if goal_type == "limit" else CategoryEnum.CAREER
    except Exception as e:
        print(f"LLM categorization error: {e}")
        return CategoryEnum.LEISURE if goal_type == "limit" else CategoryEnum.CAREER


@goals_bp.route('/api/goals/<int:goal_id>', methods=['DELETE'])
def delete_goal(goal_id):
    """Delete a goal."""
    session = Session()
    try:
        user = get_current_user(session)
        
        goal = session.query(Goal).filter(
            Goal.id == goal_id,
            Goal.user_id == user.id
        ).first()
        
        if not goal:
            return jsonify({"error": "Goal not found"}), 404
        
        session.delete(goal)
        session.commit()
        
        return jsonify({"success": True, "message": "Goal deleted"})
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
