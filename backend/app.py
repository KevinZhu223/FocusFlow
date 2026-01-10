"""
FocusFlow - Flask Application
Main API server for the Smart Productivity Tracker
Phase 3: Added gamification, goals, leaderboard, profile, and data export
"""

import os
import csv
import io
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, g, Response
from flask_cors import CORS
from sqlalchemy import func
from dotenv import load_dotenv

from models import (
    Base, User, ActivityLog, CategoryEnum, Goal, Badge, UserBadge,
    TimeframeEnum, GoalTypeEnum, Item, UserItem, init_db
)
from nlp_parser import parse_activity, generate_daily_insights
from auth import auth_bp, init_auth_routes, require_auth, get_user_from_token
from gamification import (
    process_activity_gamification, get_level_progress, calculate_level,
    open_chest, check_chest_eligibility
)
from oracle import get_oracle_insight, get_all_oracle_insights

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])  # Vite dev server

# Database configuration
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/focusflow'
)

# Initialize database
engine, Session = init_db(DATABASE_URL)

# Initialize and register auth blueprint
init_auth_routes(Session)
app.register_blueprint(auth_bp)

@app.before_request
def load_logged_in_user():
    """
    Check for Authorization header before every request.
    If a valid token exists, set g.user_id so get_current_user() finds the real user.
    """
    auth_header = request.headers.get('Authorization')
    g.user_id = None # Default to None

    if auth_header:
        # We pass the global Session factory to the helper
        user = get_user_from_token(auth_header, Session)
        if user:
            g.user_id = user.id


def get_current_user(session):
    """Get current authenticated user or demo user"""
    user_id = getattr(g, 'user_id', None)
    if user_id:
        return session.query(User).filter_by(id=user_id).first()
    return get_or_create_demo_user(session)


def get_or_create_demo_user(session):
    """Get or create a demo user for MVP testing"""
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


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "FocusFlow API", "version": "3.0"})


# ============================================================================
# ACTIVITY LOGGING (with Gamification)
# ============================================================================

@app.route('/api/log_activity', methods=['POST'])
def log_activity():
    """
    Log a new activity from natural language input.
    Now includes gamification (XP, badges) processing.
    Accepts local_hour (0-23) for timezone-aware badge checks.
    """
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({"error": "Missing 'text' field in request body"}), 400
    
    text = data['text'].strip()
    if not text:
        return jsonify({"error": "Text cannot be empty"}), 400
    
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


@app.route('/api/activities', methods=['GET'])
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
        # tz_offset is in minutes (e.g., 300 for EST = UTC-5, so we ADD 300 minutes to local to get UTC)
        # JavaScript getTimezoneOffset() returns positive for behind UTC, negative for ahead
        local_midnight = datetime.combine(target_date, datetime.min.time())
        # Convert local midnight to UTC by adding the offset
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


@app.route('/api/activities/<int:activity_id>', methods=['DELETE'])
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


@app.route('/api/activities/<int:activity_id>', methods=['PUT'])
def update_activity(activity_id):
    """
    Update an activity by ID.
    Allows editing activity_name, duration_minutes, and category.
    Recalculates productivity_score on changes.
    """
    data = request.get_json()
    
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
                from models import CategoryEnum
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

@app.route('/api/dashboard', methods=['GET'])
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
        # tz_offset is in minutes (e.g., 300 for EST = UTC-5, so we ADD 300 minutes to local to get UTC)
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
        from gamification import calculate_streak
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

@app.route('/api/weekly-recap', methods=['GET'])
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
        from gamification import calculate_streak
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


# ============================================================================
# INSIGHTS & HEATMAP
# ============================================================================

@app.route('/api/insights/daily', methods=['GET'])
def get_daily_insights():
    """Get AI-generated daily coaching insights."""
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
        
        activities_data = [a.to_dict() for a in activities]
        insight = generate_daily_insights(activities_data)
        
        return jsonify({
            "date": target_date.isoformat(),
            "insight": insight,
            "activity_count": len(activities)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/oracle', methods=['GET'])
def get_oracle():
    """
    Get AI-powered Oracle insight based on user's activity history.
    
    Query params:
        - full: If 'true', return all insights. Otherwise return single top insight.
    """
    full_mode = request.args.get('full', 'false').lower() == 'true'
    
    session = Session()
    try:
        user = get_current_user(session)
        
        # Fetch all user activities
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).order_by(ActivityLog.timestamp.desc()).all()
        
        # Cold start check
        if len(activities) < 5:
            return jsonify({
                "title": "🔮 The Oracle Awaits",
                "message": f"Log {5 - len(activities)} more activities to unlock personalized AI insights about your productivity patterns.",
                "icon": "Sparkles",
                "type": "neutral",
                "cold_start": True,
                "activities_needed": 5 - len(activities)
            })
        
        # Generate insights
        if full_mode:
            result = get_all_oracle_insights(activities)
        else:
            result = get_oracle_insight(activities)
        
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/activities/heatmap', methods=['GET'])
def get_heatmap_data():
    """Get activity data for heatmap visualization."""
    tz_offset = request.args.get('tz_offset', type=int, default=0)  # Minutes offset from UTC
    
    session = Session()
    try:
        user = get_current_user(session)
        
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=365)
        
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date + timedelta(days=1), datetime.min.time())
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= start_datetime,
            ActivityLog.timestamp < end_datetime
        ).all()
        
        # Group activities by LOCAL date (convert UTC timestamp to local)
        daily_data = {}
        for activity in activities:
            # Convert UTC timestamp to local time by subtracting the offset
            # tz_offset is positive for behind UTC (e.g., 300 for EST)
            local_timestamp = activity.timestamp - timedelta(minutes=tz_offset)
            date_key = local_timestamp.date().isoformat()
            if date_key not in daily_data:
                daily_data[date_key] = {"count": 0, "score": 0}
            daily_data[date_key]["count"] += 1
            daily_data[date_key]["score"] += activity.productivity_score or 0
        
        heatmap_data = [
            {"date": date, "count": data["count"], "score": round(data["score"], 2)}
            for date, data in sorted(daily_data.items())
        ]
        
        return jsonify({
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "data": heatmap_data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# GOALS
# ============================================================================

@app.route('/api/goals', methods=['GET'])
def get_goals():
    """Get all goals for the current user with progress."""
    session = Session()
    try:
        user = get_current_user(session)
        
        goals = session.query(Goal).filter(Goal.user_id == user.id).all()
        
        # Get timezone offset from frontend (in minutes, e.g., -300 for EST)
        # Positive offset means behind UTC, negative means ahead
        tz_offset = request.args.get('tz_offset', type=int, default=0)
        
        goals_with_progress = []
        for goal in goals:
            # Calculate user's local date using their timezone offset
            # JavaScript offset is inverted: -300 for EST means UTC-5
            now_utc = datetime.utcnow()
            user_local_datetime = now_utc - timedelta(minutes=tz_offset)
            today = user_local_datetime.date()
            
            if goal.timeframe == TimeframeEnum.DAILY:
                # Start of current day (in user's local time)
                start_date = today
                total_days = 1
                days_passed = 1
            elif goal.timeframe == TimeframeEnum.WEEKLY:
                # Start of current week (Monday) in user's local time
                start_date = today - timedelta(days=today.weekday())
                total_days = 7
                days_passed = max(1, today.weekday() + 1)
            else:  # Monthly
                # Start of current month
                start_date = today.replace(day=1)
                days_passed = today.day
                # Get total days in month
                if today.month == 12:
                    total_days = 31
                else:
                    next_month = user_local_datetime.replace(day=28) + timedelta(days=4)
                    total_days = (next_month - timedelta(days=next_month.day)).day
            
            # Convert start_date back to UTC for database query
            # The start_date is midnight in user's local time
            start_datetime_local = datetime.combine(start_date, datetime.min.time())
            # Add back the offset to get UTC time
            start_datetime_utc = start_datetime_local + timedelta(minutes=tz_offset)
            
            # Get activities for this goal in the timeframe
            # Smart matching: If goal has a title, use fuzzy matching on activity names
            # Otherwise fall back to category matching
            if goal.title:
                # Extract key terms from goal title for matching
                # e.g., "Limit Social Media" -> match activities containing "social media"
                title_lower = goal.title.lower()
                # Remove common prefixes
                for prefix in ['limit ', 'reduce ', 'avoid ', 'stop ', 'less ', 'target ', 'achieve ']:
                    if title_lower.startswith(prefix):
                        title_lower = title_lower[len(prefix):]
                        break
                
                # Get all activities in category, then filter by name match
                all_category_activities = session.query(ActivityLog).filter(
                    ActivityLog.user_id == user.id,
                    ActivityLog.category == goal.category,
                    ActivityLog.timestamp >= start_datetime_utc
                ).all()
                
                # Filter to only activities whose name contains the goal keywords
                activities = [
                    a for a in all_category_activities
                    if title_lower in a.activity_name.lower() or 
                       a.activity_name.lower() in title_lower or
                       any(word in a.activity_name.lower() for word in title_lower.split() if len(word) > 3)
                ]
            else:
                # No title - use traditional category matching
                activities = session.query(ActivityLog).filter(
                    ActivityLog.user_id == user.id,
                    ActivityLog.category == goal.category,
                    ActivityLog.timestamp >= start_datetime_utc
                ).all()
            
            # Calculate hours logged
            total_minutes = sum(a.duration_minutes or 30 for a in activities)
            hours_logged = round(total_minutes / 60, 1)
            
            # Get goal type (default to target for existing goals)
            goal_type = goal.goal_type.value if goal.goal_type else "target"
            is_limit_goal = goal_type == "limit"
            
            # Calculate progress and status based on goal type
            if is_limit_goal:
                # LIMIT GOAL: progress shows how much of budget used
                progress_percent = round((hours_logged / goal.target_value) * 100, 1)
                budget_remaining = max(0, round(goal.target_value - hours_logged, 1))
                
                # Status for limit goals (staying under is good)
                if hours_logged <= goal.target_value * 0.5:
                    pacing_status = "on_track"  # Under 50% - doing great
                elif hours_logged <= goal.target_value * 0.8:
                    pacing_status = "slightly_behind"  # 50-80% - caution
                elif hours_logged <= goal.target_value:
                    pacing_status = "at_risk"  # 80-100% - warning
                else:
                    pacing_status = "over_limit"  # Over limit
                    
                expected_hours = None  # Not applicable for limit goals
                expected_percent = None
            else:
                # TARGET GOAL: original logic
                progress_percent = min(100, round((hours_logged / goal.target_value) * 100, 1))
                expected_hours = round((goal.target_value / total_days) * days_passed, 1)
                expected_percent = min(100, round((expected_hours / goal.target_value) * 100, 1))
                budget_remaining = None
                
                # Status for target goals
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


@app.route('/api/goals', methods=['POST'])
def create_goal():
    """Create a new goal with optional custom title and goal type."""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Missing request body"}), 400
    
    # Required: target_value, timeframe
    # Optional: title, category (LLM will categorize if not provided), goal_type
    required = ['target_value', 'timeframe']
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    # Validate timeframe
    try:
        timeframe = TimeframeEnum(data['timeframe'])
    except ValueError:
        return jsonify({"error": f"Invalid timeframe: {data['timeframe']}"}), 400
    
    # Validate goal_type (default to target)
    goal_type_str = data.get('goal_type', 'target')
    try:
        goal_type = GoalTypeEnum(goal_type_str)
    except ValueError:
        return jsonify({"error": f"Invalid goal_type: {goal_type_str}"}), 400
    
    # Get optional title
    title = data.get('title', '').strip()[:255] if data.get('title') else None
    
    # Category is optional - use LLM to categorize if not provided
    category = None
    if data.get('category'):
        try:
            category = CategoryEnum(data['category'])
        except ValueError:
            pass  # Invalid category, will use LLM
    
    # If no category provided and title exists, use LLM to categorize
    if not category and title:
        try:
            category = categorize_goal_with_llm(title, goal_type_str)
        except Exception as e:
            print(f"LLM categorization failed: {e}")
            # Default to Career for target goals, Leisure for limit goals
            category = CategoryEnum.LEISURE if goal_type == GoalTypeEnum.LIMIT else CategoryEnum.CAREER
    elif not category:
        # No title and no category - use defaults
        category = CategoryEnum.LEISURE if goal_type == GoalTypeEnum.LIMIT else CategoryEnum.CAREER
    
    session = Session()
    try:
        user = get_current_user(session)
        
        goal = Goal(
            user_id=user.id,
            title=title,
            category=category,
            target_value=int(data['target_value']),
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
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        category_text = response.text.strip()
        
        # Try to match the response to a category
        category_text = category_text.title()
        for cat in CategoryEnum:
            if cat.value in category_text or category_text in cat.value:
                return cat
        
        # Default based on goal type
        return CategoryEnum.LEISURE if goal_type == "limit" else CategoryEnum.CAREER
    except Exception as e:
        print(f"LLM categorization error: {e}")
        return CategoryEnum.LEISURE if goal_type == "limit" else CategoryEnum.CAREER


@app.route('/api/goals/<int:goal_id>', methods=['DELETE'])
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


# ============================================================================
# LEADERBOARD
# ============================================================================

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get top 10 public users by weekly score."""
    session = Session()
    try:
        # Get timezone offset from frontend (in minutes, e.g., -300 for EST)
        tz_offset = request.args.get('tz_offset', type=int, default=0)
        
        # Calculate user's local date and week start
        now_utc = datetime.utcnow()
        user_local_datetime = now_utc - timedelta(minutes=tz_offset)
        today = user_local_datetime.date()
        start_of_week = today - timedelta(days=today.weekday())
        
        # Convert to UTC for database query
        start_datetime_local = datetime.combine(start_of_week, datetime.min.time())
        start_datetime_utc = start_datetime_local + timedelta(minutes=tz_offset)
        
        # Get all public users
        public_users = session.query(User).filter(User.is_public == True).all()
        
        leaderboard = []
        for user in public_users:
            # Calculate weekly score
            activities = session.query(ActivityLog).filter(
                ActivityLog.user_id == user.id,
                ActivityLog.timestamp >= start_datetime_utc
            ).all()
            
            weekly_score = sum(a.productivity_score for a in activities)
            
            leaderboard.append({
                "user_id": user.id,
                "name": user.name,
                "level": user.level,
                "avatar_color": user.avatar_color or "#6366f1",
                "weekly_score": round(weekly_score, 2)
            })
        
        # Sort by weekly score descending
        leaderboard.sort(key=lambda x: x["weekly_score"], reverse=True)
        
        # Add rank
        for i, entry in enumerate(leaderboard[:10]):
            entry["rank"] = i + 1
        
        return jsonify({
            "week_start": start_of_week.isoformat(),
            "leaderboard": leaderboard[:10]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# CHALLENGES (Sprint 3)
# ============================================================================

@app.route('/api/challenges', methods=['GET'])
def get_challenges():
    """Get all challenges for the current user (created or received)."""
    session = Session()
    try:
        user = get_current_user(session)
        
        from models import Challenge, ChallengeStatusEnum
        
        # Get challenges where user is creator or opponent
        challenges = session.query(Challenge).filter(
            (Challenge.creator_id == user.id) | (Challenge.opponent_id == user.id)
        ).order_by(Challenge.created_at.desc()).all()
        
        return jsonify({
            "challenges": [c.to_dict(include_users=True) for c in challenges]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/challenges', methods=['POST'])
def create_challenge():
    """Create a new challenge to send to a friend."""
    session = Session()
    try:
        user = get_current_user(session)
        data = request.get_json()
        
        from models import Challenge, ChallengeStatusEnum, CategoryEnum, TimeframeEnum
        
        opponent_id = data.get('opponent_id')
        title = data.get('title', 'Weekly Challenge')
        category = data.get('category')  # Optional
        target_hours = data.get('target_hours', 5)
        timeframe = data.get('timeframe', 'weekly')
        
        if not opponent_id:
            return jsonify({"error": "opponent_id is required"}), 400
        
        if opponent_id == user.id:
            return jsonify({"error": "Cannot challenge yourself"}), 400
        
        # Create challenge
        challenge = Challenge(
            creator_id=user.id,
            opponent_id=opponent_id,
            title=title,
            category=CategoryEnum[category.upper()] if category else None,
            target_hours=target_hours,
            timeframe=TimeframeEnum[timeframe.upper()] if timeframe else TimeframeEnum.WEEKLY,
            status=ChallengeStatusEnum.PENDING
        )
        
        session.add(challenge)
        session.commit()
        
        return jsonify({
            "message": "Challenge created!",
            "challenge": challenge.to_dict(include_users=True)
        }), 201
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/challenges/<int:challenge_id>/accept', methods=['POST'])
def accept_challenge(challenge_id):
    """Accept a pending challenge."""
    session = Session()
    try:
        user = get_current_user(session)
        
        from models import Challenge, ChallengeStatusEnum, TimeframeEnum
        
        challenge = session.query(Challenge).get(challenge_id)
        
        if not challenge:
            return jsonify({"error": "Challenge not found"}), 404
        
        if challenge.opponent_id != user.id:
            return jsonify({"error": "Only the challenged user can accept"}), 403
        
        if challenge.status != ChallengeStatusEnum.PENDING:
            return jsonify({"error": "Challenge is not pending"}), 400
        
        # Calculate start and end dates based on timeframe
        now = datetime.utcnow()
        challenge.start_date = now
        
        if challenge.timeframe == TimeframeEnum.DAILY:
            challenge.end_date = now + timedelta(days=1)
        elif challenge.timeframe == TimeframeEnum.WEEKLY:
            challenge.end_date = now + timedelta(days=7)
        else:  # MONTHLY
            challenge.end_date = now + timedelta(days=30)
        
        challenge.status = ChallengeStatusEnum.ACTIVE
        session.commit()
        
        return jsonify({
            "message": "Challenge accepted!",
            "challenge": challenge.to_dict(include_users=True)
        })
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/challenges/<int:challenge_id>/decline', methods=['POST'])
def decline_challenge(challenge_id):
    """Decline a pending challenge."""
    session = Session()
    try:
        user = get_current_user(session)
        
        from models import Challenge, ChallengeStatusEnum
        
        challenge = session.query(Challenge).get(challenge_id)
        
        if not challenge:
            return jsonify({"error": "Challenge not found"}), 404
        
        if challenge.opponent_id != user.id:
            return jsonify({"error": "Only the challenged user can decline"}), 403
        
        if challenge.status != ChallengeStatusEnum.PENDING:
            return jsonify({"error": "Challenge is not pending"}), 400
        
        challenge.status = ChallengeStatusEnum.DECLINED
        session.commit()
        
        return jsonify({
            "message": "Challenge declined",
            "challenge": challenge.to_dict(include_users=True)
        })
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/challenges/active', methods=['GET'])
def get_active_challenges():
    """Get active challenges with current scores."""
    session = Session()
    try:
        user = get_current_user(session)
        
        from models import Challenge, ChallengeStatusEnum, ActivityLog
        
        # Get active challenges
        challenges = session.query(Challenge).filter(
            (Challenge.creator_id == user.id) | (Challenge.opponent_id == user.id),
            Challenge.status == ChallengeStatusEnum.ACTIVE
        ).all()
        
        result = []
        for challenge in challenges:
            # Calculate current scores based on activities during challenge period
            creator_activities = session.query(ActivityLog).filter(
                ActivityLog.user_id == challenge.creator_id,
                ActivityLog.timestamp >= challenge.start_date,
                ActivityLog.timestamp <= (challenge.end_date or datetime.utcnow())
            )
            
            opponent_activities = session.query(ActivityLog).filter(
                ActivityLog.user_id == challenge.opponent_id,
                ActivityLog.timestamp >= challenge.start_date,
                ActivityLog.timestamp <= (challenge.end_date or datetime.utcnow())
            )
            
            # Filter by category if specified
            if challenge.category:
                creator_activities = creator_activities.filter(ActivityLog.category == challenge.category)
                opponent_activities = opponent_activities.filter(ActivityLog.category == challenge.category)
            
            creator_score = sum(a.productivity_score for a in creator_activities.all())
            opponent_score = sum(a.productivity_score for a in opponent_activities.all())
            
            # Update scores in DB
            challenge.creator_score = creator_score
            challenge.opponent_score = opponent_score
            
            # Check if challenge has ended
            if challenge.end_date and datetime.utcnow() >= challenge.end_date:
                challenge.status = ChallengeStatusEnum.COMPLETED
                if creator_score > opponent_score:
                    challenge.winner_id = challenge.creator_id
                elif opponent_score > creator_score:
                    challenge.winner_id = challenge.opponent_id
                # If tie, no winner
            
            result.append({
                **challenge.to_dict(include_users=True),
                "is_creator": challenge.creator_id == user.id,
                "my_score": creator_score if challenge.creator_id == user.id else opponent_score,
                "opponent_score": opponent_score if challenge.creator_id == user.id else creator_score,
                "time_remaining": (challenge.end_date - datetime.utcnow()).total_seconds() if challenge.end_date else None
            })
        
        session.commit()
        
        return jsonify({
            "active_challenges": result
        })
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# USER PROFILE
# ============================================================================

@app.route('/api/user/profile', methods=['GET'])
def get_profile():
    """Get current user's full profile including badges."""
    session = Session()
    try:
        user = get_current_user(session)
        
        # Get user badges
        user_badges = session.query(UserBadge).filter(
            UserBadge.user_id == user.id
        ).all()
        
        badges = [ub.to_dict() for ub in user_badges]
        
        # Get level progress
        level_info = get_level_progress(user.xp)
        
        # Get total stats
        total_activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).count()
        
        total_score = session.query(func.sum(ActivityLog.productivity_score)).filter(
            ActivityLog.user_id == user.id
        ).scalar() or 0
        
        return jsonify({
            "user": user.to_dict(include_private=True),
            "level_progress": level_info,
            "badges": badges,
            "stats": {
                "total_activities": total_activities,
                "total_score": round(total_score, 2),
                "member_since": user.created_at.isoformat() if user.created_at else None
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/user/profile', methods=['PUT'])
def update_profile():
    """Update user profile (bio, avatar_color, is_public)."""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Missing request body"}), 400
    
    session = Session()
    try:
        user = get_current_user(session)
        
        # Update allowed fields
        if 'bio' in data:
            user.bio = data['bio'][:500] if data['bio'] else None
        
        if 'avatar_color' in data:
            user.avatar_color = data['avatar_color']
        
        if 'is_public' in data:
            user.is_public = bool(data['is_public'])
        
        if 'name' in data and data['name'].strip():
            user.name = data['name'].strip()[:255]
        
        if 'birth_year' in data:
            if data['birth_year']:
                year = int(data['birth_year'])
                if 1920 <= year <= datetime.utcnow().year:
                    user.birth_year = year
            else:
                user.birth_year = None
        
        session.commit()
        
        return jsonify({
            "success": True,
            "user": user.to_dict(include_private=True)
        })
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# DATA EXPORT
# ============================================================================

@app.route('/api/user/export_data', methods=['GET'])
def export_data():
    """Export all user activity data as CSV."""
    session = Session()
    try:
        user = get_current_user(session)
        
        # Get all user activities
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).order_by(ActivityLog.timestamp.desc()).all()
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header row
        writer.writerow([
            'Timestamp', 'Activity', 'Category', 'Duration (min)',
            'Productivity Score', 'Focus Session', 'Raw Input'
        ])
        
        # Data rows
        for activity in activities:
            writer.writerow([
                activity.timestamp.isoformat() if activity.timestamp else '',
                activity.activity_name,
                activity.category.value if activity.category else '',
                activity.duration_minutes or '',
                round(activity.productivity_score, 2) if activity.productivity_score else '',
                'Yes' if activity.is_focus_session else 'No',
                activity.raw_input
            ])
        
        # Create response
        output.seek(0)
        response = Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=focusflow_export_{datetime.utcnow().strftime("%Y%m%d")}.csv'
            }
        )
        
        return response
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# INTERVENTION / WATCHER SYSTEM (Phase 4)
# ============================================================================

@app.route('/api/intervention/heartbeat', methods=['POST'])
def intervention_heartbeat():
    """
    Receive heartbeat from Watcher script when gaming app is detected.
    Increments today_gaming_minutes and returns status.
    """
    data = request.get_json()
    app_detected = data.get('app_detected', 'Unknown') if data else 'Unknown'
    
    session = Session()
    try:
        user = get_current_user(session)
        
        # Reset daily gaming minutes if it's a new day
        today = datetime.utcnow().date()
        if user.last_gaming_reset is None or user.last_gaming_reset.date() < today:
            user.today_gaming_minutes = 0
            user.last_gaming_reset = datetime.utcnow()
        
        # Increment gaming minutes
        user.today_gaming_minutes += 1
        session.commit()
        
        # Calculate remaining time
        allowance = user.daily_gaming_allowance or 60
        minutes_used = user.today_gaming_minutes
        remaining = allowance - minutes_used
        
        # Determine status
        if minutes_used >= allowance:
            status = 'CRITICAL'
            message = "⛔ LIMIT EXCEEDED! Time to stop!"
        elif remaining <= 10:
            status = 'WARNING'
            message = f"⚠️ Only {remaining} minutes remaining!"
        else:
            status = 'OK'
            message = f"✓ {remaining} minutes remaining"
        
        return jsonify({
            "status": status,
            "message": message,
            "app_detected": app_detected,
            "gaming_minutes": minutes_used,
            "allowance": allowance,
            "remaining": max(0, remaining)
        })
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/user/intervention_status', methods=['GET'])
def get_intervention_status():
    """Get current intervention/gaming status for polling."""
    session = Session()
    try:
        user = get_current_user(session)
        
        # Reset daily gaming minutes if it's a new day
        today = datetime.utcnow().date()
        if user.last_gaming_reset is None or user.last_gaming_reset.date() < today:
            user.today_gaming_minutes = 0
            user.last_gaming_reset = datetime.utcnow()
            session.commit()
        
        allowance = user.daily_gaming_allowance or 60
        minutes_used = user.today_gaming_minutes
        remaining = allowance - minutes_used
        
        if minutes_used >= allowance:
            status = 'CRITICAL'
        elif remaining <= 10:
            status = 'WARNING'
        else:
            status = 'OK'
        
        return jsonify({
            "status": status,
            "gaming_minutes": minutes_used,
            "allowance": allowance,
            "remaining": max(0, remaining)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# LOOT BOX / COLLECTION SYSTEM (Phase 4)
# ============================================================================

@app.route('/api/user/chest_status', methods=['GET'])
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


@app.route('/api/user/open_chest', methods=['POST'])
def open_loot_chest():
    """Open a loot chest using 1 credit."""
    session = Session()
    try:
        user = get_current_user(session)
        
        # Open the chest (credit check is done in open_chest function)
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


@app.route('/api/user/collection', methods=['GET'])
def get_user_collection():
    """Get all items the user has collected."""
    session = Session()
    try:
        user = get_current_user(session)
        
        # Get user's items
        user_items = session.query(UserItem).filter(
            UserItem.user_id == user.id
        ).all()
        
        # Get all items for silhouettes
        all_items = session.query(Item).all()
        all_items_dict = {item.id: item.to_dict() for item in all_items}
        
        # Build collection with owned/unowned status
        owned_ids = {ui.item_id for ui in user_items}
        owned_items = [ui.to_dict() for ui in user_items]
        
        # Count broken items
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


@app.route('/api/items/repair/<int:item_id>', methods=['POST'])
def repair_item_endpoint(item_id):
    """Repair a broken item by spending chest credits."""
    from gamification import repair_item
    
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


@app.route('/api/projection', methods=['GET'])
def get_time_projection():
    """Calculate life projection based on leisure time habits."""
    session = Session()
    try:
        user = get_current_user(session)
        
        # Get user's age
        current_year = datetime.utcnow().year
        if user.birth_year:
            age = current_year - user.birth_year
        else:
            age = 25  # Default assumption if no birth year set
        
        # Calculate remaining years (assuming 80 year lifespan)
        remaining_years = max(0, 80 - age)
        
        # Get last 7 days of leisure activity
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        leisure_activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= seven_days_ago,
            ActivityLog.category == CategoryEnum.LEISURE
        ).all()
        
        # Calculate average daily leisure
        total_leisure_minutes = sum(a.duration_minutes or 30 for a in leisure_activities)
        avg_daily_leisure_minutes = total_leisure_minutes / 7
        avg_daily_leisure_hours = avg_daily_leisure_minutes / 60
        
        # Calculate years wasted projection
        # Formula: avg_daily_leisure * 365 * remaining_years / (24 * 365) = years on leisure
        minutes_per_year = avg_daily_leisure_minutes * 365
        hours_per_year = minutes_per_year / 60
        years_on_leisure = (avg_daily_leisure_minutes * 365 * remaining_years) / (60 * 24 * 365)
        
        # Calculate what percentage of remaining life
        percent_of_life = (avg_daily_leisure_hours / 24) * 100
        
        # Check today's leisure for intervention trigger
        today = datetime.utcnow().date()
        start_of_today = datetime.combine(today, datetime.min.time())
        
        todays_leisure = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= start_of_today,
            ActivityLog.category == CategoryEnum.LEISURE
        ).all()
        
        today_leisure_minutes = sum(a.duration_minutes or 30 for a in todays_leisure)
        today_leisure_hours = today_leisure_minutes / 60
        
        # Limit exceeded if > 1 hour leisure today (configurable per user later)
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


@app.route('/api/morning-checkin', methods=['GET'])
def get_morning_checkin():
    """Get yesterday's summary for morning check-in."""
    session = Session()
    try:
        user = get_current_user(session)
        
        # Get yesterday's date range
        today = datetime.utcnow().date()
        yesterday = today - timedelta(days=1)
        yesterday_start = datetime.combine(yesterday, datetime.min.time())
        yesterday_end = datetime.combine(today, datetime.min.time())
        
        # Get yesterday's activities
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= yesterday_start,
            ActivityLog.timestamp < yesterday_end
        ).all()
        
        # Calculate stats
        total_score = sum(a.productivity_score for a in activities)
        total_minutes = sum(a.duration_minutes or 30 for a in activities)
        
        # Category breakdown
        category_stats = {}
        for a in activities:
            cat = a.category.value if a.category else "Other"
            if cat not in category_stats:
                category_stats[cat] = {"minutes": 0, "count": 0, "score": 0}
            category_stats[cat]["minutes"] += a.duration_minutes or 30
            category_stats[cat]["count"] += 1
            category_stats[cat]["score"] += a.productivity_score
        
        # Find best and worst categories
        best_category = None
        worst_category = None
        if category_stats:
            sorted_cats = sorted(category_stats.items(), key=lambda x: x[1]["score"], reverse=True)
            best_category = sorted_cats[0][0] if sorted_cats else None
            # Worst is the one with most time but lowest score
            for cat, stats in sorted_cats:
                if cat == "Leisure" and stats["minutes"] > 30:
                    worst_category = cat
                    break
        
        # Generate insight message
        if not activities:
            insight = "No activities logged yesterday. Today is a fresh start!"
            mood = "neutral"
        elif total_score >= 100:
            insight = f"Great day yesterday! You scored {round(total_score)} points. Keep that momentum today!"
            mood = "positive"
        elif total_score >= 50:
            insight = f"Solid effort yesterday with {round(total_score)} points. Let's push a bit harder today!"
            mood = "neutral"
        elif total_score >= 0:
            insight = f"Yesterday was {round(total_score)} points. Small steps count - let's make today better!"
            mood = "cautious"
        else:
            leisure_time = category_stats.get("Leisure", {}).get("minutes", 0)
            insight = f"Yesterday's score was {round(total_score)}. "
            if leisure_time > 60:
                insight += f"You spent {round(leisure_time/60, 1)}h on leisure. Try setting a limit today."
            else:
                insight += "Focus on productive activities today to turn things around."
            mood = "warning"
        
        # Improvement suggestion
        suggestion = None
        if category_stats.get("Leisure", {}).get("minutes", 0) > 120:
            suggestion = "Try limiting leisure activities to under 2 hours today"
        elif category_stats.get("Career", {}).get("minutes", 0) < 60:
            suggestion = "Aim for at least 1 hour of career-focused work today"
        elif category_stats.get("Health", {}).get("minutes", 0) == 0:
            suggestion = "Consider adding a health activity like exercise or meditation"
        
        return jsonify({
            "yesterday_date": yesterday.isoformat(),
            "activity_count": len(activities),
            "total_hours": round(total_minutes / 60, 1),
            "total_score": round(total_score, 1),
            "category_breakdown": category_stats,
            "best_category": best_category,
            "worst_category": worst_category,
            "insight": insight,
            "mood": mood,
            "suggestion": suggestion,
            "has_data": len(activities) > 0
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# FRIEND SYSTEM (Phase 5)
# ============================================================================

@app.route('/api/friends', methods=['GET'])
def get_friends():
    """Get all friends and pending requests for the current user."""
    from models import Friendship, FriendshipStatusEnum
    
    session = Session()
    try:
        user = get_current_user(session)
        
        # Get accepted friendships (both directions)
        friends_as_requester = session.query(Friendship).filter(
            Friendship.user_id == user.id,
            Friendship.status == FriendshipStatusEnum.ACCEPTED
        ).all()
        
        friends_as_receiver = session.query(Friendship).filter(
            Friendship.friend_id == user.id,
            Friendship.status == FriendshipStatusEnum.ACCEPTED
        ).all()
        
        # Get pending requests TO this user (received)
        pending_received = session.query(Friendship).filter(
            Friendship.friend_id == user.id,
            Friendship.status == FriendshipStatusEnum.PENDING
        ).all()
        
        # Get pending requests FROM this user (sent)
        pending_sent = session.query(Friendship).filter(
            Friendship.user_id == user.id,
            Friendship.status == FriendshipStatusEnum.PENDING
        ).all()
        
        # Build friend list
        friends = []
        for f in friends_as_requester:
            friends.append({
                "friendship_id": f.id,
                "user": f.receiver.to_dict(include_private=False) if f.receiver else None
            })
        for f in friends_as_receiver:
            friends.append({
                "friendship_id": f.id,
                "user": f.requester.to_dict(include_private=False) if f.requester else None
            })
        
        return jsonify({
            "friends": friends,
            "pending_received": [f.to_dict(include_user=True) for f in pending_received],
            "pending_sent": [f.to_dict(include_friend=True) for f in pending_sent]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/friends/request', methods=['POST'])
def send_friend_request():
    """Send a friend request by email or username."""
    from models import Friendship, FriendshipStatusEnum
    
    data = request.get_json()
    identifier = data.get('identifier', '').strip() if data else None
    # Also support legacy 'email' field for backwards compatibility
    if not identifier:
        identifier = data.get('email', '').strip() if data else None
    
    if not identifier:
        return jsonify({"error": "Email or username is required"}), 400
    
    session = Session()
    try:
        user = get_current_user(session)
        
        # Determine if it's an email (contains @) or username
        is_email = '@' in identifier
        
        if is_email:
            # Can't friend yourself
            if user.email.lower() == identifier.lower():
                return jsonify({"error": "Cannot send friend request to yourself"}), 400
            
            # Find target user by email
            target_user = session.query(User).filter(
                User.email.ilike(identifier)
            ).first()
        else:
            # Can't friend yourself
            if user.name.lower() == identifier.lower():
                return jsonify({"error": "Cannot send friend request to yourself"}), 400
            
            # Find target user by username (case-insensitive)
            target_user = session.query(User).filter(
                User.name.ilike(identifier)
            ).first()
        
        if not target_user:
            return jsonify({"error": f"User not found with {'email' if is_email else 'username'}: {identifier}"}), 404
        
        # Check for existing friendship or request
        existing = session.query(Friendship).filter(
            ((Friendship.user_id == user.id) & (Friendship.friend_id == target_user.id)) |
            ((Friendship.user_id == target_user.id) & (Friendship.friend_id == user.id))
        ).first()
        
        if existing:
            if existing.status == FriendshipStatusEnum.ACCEPTED:
                return jsonify({"error": "Already friends with this user"}), 400
            else:
                return jsonify({"error": "Friend request already pending"}), 400
        
        # Create friend request
        friendship = Friendship(
            user_id=user.id,
            friend_id=target_user.id,
            status=FriendshipStatusEnum.PENDING
        )
        session.add(friendship)
        session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Friend request sent to {target_user.name}",
            "friendship": friendship.to_dict(include_friend=True)
        }), 201
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/friends/accept', methods=['POST'])
def accept_friend_request():
    """Accept a pending friend request."""
    from models import Friendship, FriendshipStatusEnum
    
    data = request.get_json()
    friendship_id = data.get('friendship_id') if data else None
    
    if not friendship_id:
        return jsonify({"error": "friendship_id is required"}), 400
    
    session = Session()
    try:
        user = get_current_user(session)
        
        # Find the pending request TO this user
        friendship = session.query(Friendship).filter(
            Friendship.id == friendship_id,
            Friendship.friend_id == user.id,  # Must be the receiver
            Friendship.status == FriendshipStatusEnum.PENDING
        ).first()
        
        if not friendship:
            return jsonify({"error": "Friend request not found"}), 404
        
        friendship.status = FriendshipStatusEnum.ACCEPTED
        session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Now friends with {friendship.requester.name}",
            "friendship": friendship.to_dict(include_user=True)
        })
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/friends/<int:friendship_id>', methods=['DELETE'])
def remove_friend(friendship_id):
    """Remove a friend or decline a request."""
    from models import Friendship
    
    session = Session()
    try:
        user = get_current_user(session)
        
        # Find the friendship (either direction)
        friendship = session.query(Friendship).filter(
            Friendship.id == friendship_id,
            (Friendship.user_id == user.id) | (Friendship.friend_id == user.id)
        ).first()
        
        if not friendship:
            return jsonify({"error": "Friendship not found"}), 404
        
        session.delete(friendship)
        session.commit()
        
        return jsonify({"success": True, "message": "Friend removed"})
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


if __name__ == '__main__':
    print("Starting FocusFlow API Server (Phase 5)...")
    print(f"Database: {DATABASE_URL}")
    
    # Auto-seed items and badges if empty
    try:
        from gamification import seed_items, ITEM_DEFINITIONS
        from seed_data import seed_badges
        session = Session()
        
        # Check if items need seeding
        from models import Item, Badge
        item_count = session.query(Item).count()
        if item_count == 0:
            print("Seeding items...")
            seed_items(session)
            print(f"✓ Seeded {len(ITEM_DEFINITIONS)} items")
        
        # Check if badges need seeding  
        badge_count = session.query(Badge).count()
        if badge_count == 0:
            print("Seeding badges...")
            seed_badges(session)
            print("✓ Seeded badges")
        
        session.close()
    except Exception as e:
        print(f"Warning: Auto-seed failed: {e}")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
