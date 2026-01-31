"""
FocusFlow - Activities Blueprint
Handles activity logging, CRUD operations, dashboard, and weekly recap.
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify

from models import ActivityLog, CategoryEnum, User
from utils import get_current_user
from nlp_parser import parse_activity
from gamification import process_activity_gamification, get_level_progress, calculate_streak
from schemas import activity_log_schema, activity_update_schema
from errors import handle_validation_error, api_error_response


# Create blueprint
activities_bp = Blueprint('activities', __name__)

# Session factory will be set by app.py
Session = None

def init_activities_routes(session_factory):
    """Initialize the blueprint with the database session factory."""
    global Session
    Session = session_factory


# ============================================================================
# HEALTH CHECK
# ============================================================================

@activities_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "FocusFlow API", "version": "3.0"})


# ============================================================================
# ACTIVITY LOGGING (with Gamification)
# ============================================================================

@activities_bp.route('/api/log_activity', methods=['POST'])
@handle_validation_error
def log_activity():
    """
    Log a new activity from natural language input.
    Now includes gamification (XP, badges) processing.
    Accepts local_hour (0-23) for timezone-aware badge checks.
    """
    data = request.get_json() or {}
    if "text" not in data and "raw_input" not in data:
        return api_error_response("VALIDATION_ERROR", "Missing 'text' or 'raw_input'", status_code=400)
    text = activity_log_schema.get_cleaned_text(data)
    if not text:
        return api_error_response("VALIDATION_ERROR", "Text cannot be empty", status_code=400)
    if data.get("source"):
        activity_log_schema.load({"source": data["source"]}, partial=True)
    
    # Get local hour from frontend (for timezone-aware badges)
    local_hour = data.get('local_hour')
    if local_hour is not None:
        try:
            local_hour = int(local_hour)
            if not (0 <= local_hour <= 23):
                local_hour = None
        except (ValueError, TypeError):
            local_hour = None
    
    # Parse the activity using NLP
    parsed = parse_activity(text)
    
    session = Session()
    try:
        user = get_current_user(session)
        
        # Create activity log entry
        activity = ActivityLog(
            user_id=user.id,
            raw_input=text,
            activity_name=parsed['activity_name'],
            category=parsed['category'],
            duration_minutes=parsed['duration_minutes'],
            sentiment_score=parsed['sentiment_score'],
            productivity_score=parsed['productivity_score'],
            is_focus_session=1 if parsed.get('is_focus_session') else 0,
            timestamp=datetime.utcnow()
        )
        
        session.add(activity)
        session.flush()  # Get activity ID
        
        # Get all user activities for badge checking
        all_activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).all()
        
        # Process gamification (XP + badges) - pass local_hour for timezone-aware checks
        gamification_result = process_activity_gamification(
            session, user, activity, all_activities, local_hour
        )
        
        # Award chest credits for CUMULATIVE productive work (Phase 4.5)
        # 1 key per 2 hours of productive work, CUMULATIVE across activities
        credits_earned = 0
        if parsed['productivity_score'] > 0:
            duration_minutes = parsed['duration_minutes'] or 30
            
            # Add to cumulative productive minutes
            user.productive_minutes = (user.productive_minutes or 0) + duration_minutes
            
            # Check if we crossed 120-minute threshold (2 hours)
            keys_from_threshold = user.productive_minutes // 120  # Full keys earned
            remaining_minutes = user.productive_minutes % 120  # Leftover minutes
            
            if keys_from_threshold > 0:
                credits_earned = keys_from_threshold
                user.chest_credits = (user.chest_credits or 0) + credits_earned
                user.productive_minutes = remaining_minutes  # Keep remainder for next time
        
        session.commit()
        
        return jsonify({
            "success": True,
            "activity": activity.to_dict(),
            "gamification": gamification_result,
            "credits_earned": credits_earned,
            "total_credits": user.chest_credits or 0,
            "productive_minutes_progress": user.productive_minutes or 0  # Minutes toward next key
        }), 201
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@activities_bp.route('/api/activities', methods=['GET'])
def get_activities():
    """Get activities for the current user."""
    date_str = request.args.get('date')
    tz_offset = request.args.get('tz_offset', type=int, default=0)  # Minutes offset from UTC
    limit = min(int(request.args.get('limit', 50)), 100)
    
    session = Session()
    try:
        user = get_current_user(session)
        
        query = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        )
        
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            target_date = datetime.utcnow().date()
        
        # Calculate UTC range for the user's local day
        local_midnight = datetime.combine(target_date, datetime.min.time())
        start_of_day_utc = local_midnight + timedelta(minutes=tz_offset)
        end_of_day_utc = start_of_day_utc + timedelta(days=1)
        
        query = query.filter(
            ActivityLog.timestamp >= start_of_day_utc,
            ActivityLog.timestamp < end_of_day_utc
        )
        
        activities = query.order_by(ActivityLog.timestamp.desc()).limit(limit).all()
        
        return jsonify({
            "date": target_date.isoformat(),
            "count": len(activities),
            "activities": [a.to_dict() for a in activities]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@activities_bp.route('/api/activities/<int:activity_id>', methods=['DELETE'])
def delete_activity(activity_id):
    """Delete an activity by ID"""
    session = Session()
    try:
        user = get_current_user(session)
        
        activity = session.query(ActivityLog).filter(
            ActivityLog.id == activity_id,
            ActivityLog.user_id == user.id
        ).first()
        
        if not activity:
            return jsonify({"error": "Activity not found"}), 404
        
        session.delete(activity)
        session.commit()
        
        return jsonify({"success": True, "message": "Activity deleted"})
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@activities_bp.route('/api/activities/<int:activity_id>', methods=['PUT'])
@handle_validation_error
def update_activity(activity_id):
    """
    Update an activity by ID.
    Allows editing activity_name, duration_minutes, and category.
    Recalculates productivity_score on changes.
    """
    data = request.get_json() or {}
    activity_update_schema.load(data, partial=True)
    
    session = Session()
    try:
        user = get_current_user(session)
        
        activity = session.query(ActivityLog).filter(
            ActivityLog.id == activity_id,
            ActivityLog.user_id == user.id
        ).first()
        
        if not activity:
            return jsonify({"error": "Activity not found"}), 404
        
        # Track if we need to recalculate score
        needs_score_update = False
        
        # Update fields if provided
        if 'activity_name' in data:
            activity.activity_name = data['activity_name'].strip()
            activity.raw_input = data['activity_name'].strip()  # Also update raw input
        
        if 'duration_minutes' in data:
            new_duration = int(data['duration_minutes'])
            if new_duration != activity.duration_minutes:
                activity.duration_minutes = max(1, min(1440, new_duration))
                needs_score_update = True
        
        if 'category' in data:
            valid_categories = ['Career', 'Health', 'Leisure', 'Chores', 'Social']
            if data['category'] in valid_categories:
                if data['category'] != activity.category.value:
                    activity.category = CategoryEnum(data['category'])
                    needs_score_update = True
        
        # Recalculate productivity score if category or duration changed
        if needs_score_update:
            from nlp_parser import calculate_weighted_score
            activity.productivity_score = calculate_weighted_score(
                category=activity.category,
                duration_minutes=activity.duration_minutes,
                is_focus_session=bool(activity.is_focus_session)
            )
        
        session.commit()
        
        return jsonify({
            "success": True,
            "activity": activity.to_dict()
        })
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# DASHBOARD
# ============================================================================

@activities_bp.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """Get dashboard statistics including gamification info."""
    date_str = request.args.get('date')
    tz_offset = request.args.get('tz_offset', type=int, default=0)  # Minutes offset from UTC
    
    session = Session()
    try:
        user = get_current_user(session)
        
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            target_date = datetime.utcnow().date()
        
        # Calculate UTC range for the user's local day
        local_midnight = datetime.combine(target_date, datetime.min.time())
        start_of_day_utc = local_midnight + timedelta(minutes=tz_offset)
        end_of_day_utc = start_of_day_utc + timedelta(days=1)
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= start_of_day_utc,
            ActivityLog.timestamp < end_of_day_utc
        ).all()
        
        daily_score = sum(a.productivity_score for a in activities)
        
        category_breakdown = {}
        for category in CategoryEnum:
            category_activities = [a for a in activities if a.category == category]
            total_minutes = sum(
                a.duration_minutes or 30
                for a in category_activities
            )
            if total_minutes > 0:
                category_breakdown[category.value] = {
                    "minutes": total_minutes,
                    "count": len(category_activities)
                }
        
        sentiments = [a.sentiment_score for a in activities if a.sentiment_score is not None]
        avg_sentiment = round(sum(sentiments) / len(sentiments), 2) if sentiments else 0
        
        # Get level progress
        level_info = get_level_progress(user.xp)
        
        # Get streak info (pass timezone offset for accurate local date calculation)
        streak_info = calculate_streak(session, user.id, tz_offset)
        
        return jsonify({
            "date": target_date.isoformat(),
            "daily_score": round(daily_score, 2),
            "activity_count": len(activities),
            "average_sentiment": avg_sentiment,
            "category_breakdown": category_breakdown,
            "level": level_info["level"],
            "xp": user.xp,
            "level_progress": level_info,
            "streak": streak_info
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# WEEKLY RECAP
# ============================================================================

@activities_bp.route('/api/weekly-recap', methods=['GET'])
def get_weekly_recap():
    """Get last week's recap data for the weekly summary modal."""
    session = Session()
    try:
        user = get_current_user(session)
        
        # Calculate last week's date range
        today = datetime.utcnow().date()
        # Get Monday of this week
        this_monday = today - timedelta(days=today.weekday())
        # Last week = Monday to Sunday before this week
        last_week_end = this_monday - timedelta(days=1)  # Last Sunday
        last_week_start = last_week_end - timedelta(days=6)  # Last Monday
        
        # Previous week for trend comparison
        prev_week_end = last_week_start - timedelta(days=1)
        prev_week_start = prev_week_end - timedelta(days=6)
        
        # Get last week's activities
        start_datetime = datetime.combine(last_week_start, datetime.min.time())
        end_datetime = datetime.combine(last_week_end, datetime.max.time())
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= start_datetime,
            ActivityLog.timestamp <= end_datetime
        ).all()
        
        # Get previous week's activities for trend
        prev_start_datetime = datetime.combine(prev_week_start, datetime.min.time())
        prev_end_datetime = datetime.combine(prev_week_end, datetime.max.time())
        
        prev_activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= prev_start_datetime,
            ActivityLog.timestamp <= prev_end_datetime
        ).all()
        
        # Calculate stats
        total_activities = len(activities)
        total_score = sum(a.productivity_score for a in activities)
        total_minutes = sum(a.duration_minutes or 30 for a in activities)
        total_hours = round(total_minutes / 60, 1)
        
        prev_total_score = sum(a.productivity_score for a in prev_activities)
        
        # Trend calculation
        if prev_total_score > 0:
            trend_vs_previous = ((total_score - prev_total_score) / prev_total_score) * 100
        else:
            trend_vs_previous = 100 if total_score > 0 else 0
        
        # Category breakdown
        category_breakdown = {}
        for category in CategoryEnum:
            category_activities = [a for a in activities if a.category == category]
            cat_minutes = sum(a.duration_minutes or 30 for a in category_activities)
            if cat_minutes > 0:
                category_breakdown[category.value] = {
                    "minutes": cat_minutes,
                    "count": len(category_activities)
                }
        
        # Find top day
        daily_scores = {}
        for activity in activities:
            day = activity.timestamp.date().isoformat()
            daily_scores[day] = daily_scores.get(day, 0) + activity.productivity_score
        
        top_day = None
        if daily_scores:
            best_day = max(daily_scores.items(), key=lambda x: x[1])
            top_day = {"date": best_day[0], "score": best_day[1]}
        
        # Calculate max streak during the week
        streak_info = calculate_streak(session, user.id)
        
        # Get badges earned during the week
        badges_earned = []
        for ub in user.badges:
            if ub.earned_at and start_datetime <= ub.earned_at <= end_datetime:
                badges_earned.append(ub.badge.to_dict())
        
        return jsonify({
            "week_start": last_week_start.isoformat(),
            "week_end": last_week_end.isoformat(),
            "total_activities": total_activities,
            "total_score": round(total_score, 1),
            "total_hours": total_hours,
            "category_breakdown": category_breakdown,
            "trend_vs_previous": round(trend_vs_previous, 1),
            "top_day": top_day,
            "badges_earned": badges_earned,
            "streak_max": streak_info.get("longest_streak", 0)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
