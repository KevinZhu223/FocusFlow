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
    TimeframeEnum, Item, UserItem, init_db
)
from nlp_parser import parse_activity, generate_daily_insights
from auth import auth_bp, init_auth_routes, require_auth, get_user_from_token
from gamification import (
    process_activity_gamification, get_level_progress, calculate_level,
    open_chest, check_chest_eligibility
)

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
        
        # Award chest credits for productive work (Phase 4.5)
        credits_earned = 0
        if parsed['productivity_score'] > 0:
            duration_hours = (parsed['duration_minutes'] or 30) / 60
            credits_earned = int(duration_hours // 2)  # 1 credit per 2 hours
            if credits_earned > 0:
                user.chest_credits = (user.chest_credits or 0) + credits_earned
        
        session.commit()
        
        return jsonify({
            "success": True,
            "activity": activity.to_dict(),
            "gamification": gamification_result,
            "credits_earned": credits_earned,
            "total_credits": user.chest_credits or 0
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
        
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = start_of_day + timedelta(days=1)
        
        query = query.filter(
            ActivityLog.timestamp >= start_of_day,
            ActivityLog.timestamp < end_of_day
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


# ============================================================================
# DASHBOARD
# ============================================================================

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """Get dashboard statistics including gamification info."""
    date_str = request.args.get('date')
    
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
        
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = start_of_day + timedelta(days=1)
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= start_of_day,
            ActivityLog.timestamp < end_of_day
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
        
        return jsonify({
            "date": target_date.isoformat(),
            "daily_score": round(daily_score, 2),
            "activity_count": len(activities),
            "average_sentiment": avg_sentiment,
            "category_breakdown": category_breakdown,
            "level": level_info["level"],
            "xp": user.xp,
            "level_progress": level_info
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
        
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = start_of_day + timedelta(days=1)
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= start_of_day,
            ActivityLog.timestamp < end_of_day
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


@app.route('/api/activities/heatmap', methods=['GET'])
def get_heatmap_data():
    """Get activity data for heatmap visualization."""
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
        
        daily_data = {}
        for activity in activities:
            date_key = activity.timestamp.date().isoformat()
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
        
        goals_with_progress = []
        for goal in goals:
            # Calculate progress based on timeframe
            if goal.timeframe == TimeframeEnum.WEEKLY:
                # Start of current week (Monday)
                today = datetime.utcnow().date()
                start_date = today - timedelta(days=today.weekday())
            else:
                # Start of current month
                today = datetime.utcnow().date()
                start_date = today.replace(day=1)
            
            start_datetime = datetime.combine(start_date, datetime.min.time())
            
            # Get activities for this category in the timeframe
            activities = session.query(ActivityLog).filter(
                ActivityLog.user_id == user.id,
                ActivityLog.category == goal.category,
                ActivityLog.timestamp >= start_datetime
            ).all()
            
            # Calculate hours logged
            total_minutes = sum(a.duration_minutes or 30 for a in activities)
            hours_logged = round(total_minutes / 60, 1)
            progress_percent = min(100, round((hours_logged / goal.target_value) * 100, 1))
            
            # Smart pacing: calculate expected progress based on day of week
            today = datetime.utcnow()
            if goal.timeframe == TimeframeEnum.WEEKLY:
                # Days into the week (1 = Monday, 7 = Sunday)
                days_passed = max(1, today.weekday() + 1)  # weekday() returns 0-6
                total_days = 7
            else:  # Monthly
                days_passed = today.day
                # Get total days in month
                if today.month == 12:
                    total_days = 31
                else:
                    next_month = today.replace(day=28) + timedelta(days=4)
                    total_days = (next_month - timedelta(days=next_month.day)).day
            
            expected_hours = round((goal.target_value / total_days) * days_passed, 1)
            expected_percent = min(100, round((expected_hours / goal.target_value) * 100, 1))
            
            # Determine status based on pacing
            if progress_percent >= 100:
                pacing_status = "complete"
            elif hours_logged >= expected_hours:
                pacing_status = "on_track"
            elif hours_logged >= expected_hours * 0.7:
                pacing_status = "slightly_behind"
            else:
                pacing_status = "at_risk"
            
            goal_data = goal.to_dict()
            goal_data["hours_logged"] = hours_logged
            goal_data["progress_percent"] = progress_percent
            goal_data["expected_hours"] = expected_hours
            goal_data["expected_percent"] = expected_percent
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
    """Create a new goal with optional custom title."""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Missing request body"}), 400
    
    required = ['category', 'target_value', 'timeframe']
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
    
    # Validate category
    try:
        category = CategoryEnum(data['category'])
    except ValueError:
        return jsonify({"error": f"Invalid category: {data['category']}"}), 400
    
    # Validate timeframe
    try:
        timeframe = TimeframeEnum(data['timeframe'])
    except ValueError:
        return jsonify({"error": f"Invalid timeframe: {data['timeframe']}"}), 400
    
    # Get optional title
    title = data.get('title', '').strip()[:255] if data.get('title') else None
    
    session = Session()
    try:
        user = get_current_user(session)
        
        # Check if goal for this category/timeframe already exists
        existing = session.query(Goal).filter(
            Goal.user_id == user.id,
            Goal.category == category,
            Goal.timeframe == timeframe
        ).first()
        
        if existing:
            # Update existing goal
            existing.target_value = int(data['target_value'])
            existing.title = title or existing.title  # Keep old title if not provided
            goal = existing
        else:
            # Create new goal
            goal = Goal(
                user_id=user.id,
                title=title,
                category=category,
                target_value=int(data['target_value']),
                timeframe=timeframe
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
        # Get start of current week
        today = datetime.utcnow().date()
        start_of_week = today - timedelta(days=today.weekday())
        start_datetime = datetime.combine(start_of_week, datetime.min.time())
        
        # Get all public users
        public_users = session.query(User).filter(User.is_public == True).all()
        
        leaderboard = []
        for user in public_users:
            # Calculate weekly score
            activities = session.query(ActivityLog).filter(
                ActivityLog.user_id == user.id,
                ActivityLog.timestamp >= start_datetime
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
        
        return jsonify({
            "owned_items": owned_items,
            "owned_count": len(owned_items),
            "total_items": len(all_items),
            "all_items": [
                {
                    **item.to_dict(),
                    "owned": item.id in owned_ids,
                    "count": next((ui.count for ui in user_items if ui.item_id == item.id), 0)
                }
                for item in all_items
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


if __name__ == '__main__':
    print("Starting FocusFlow API Server (Phase 4)...")
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
