"""
FocusFlow - Insights Blueprint
Handles AI insights, Oracle, heatmap data, and morning check-in.
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify

from models import ActivityLog
from utils import get_current_user, build_insight_context
from nlp_parser import generate_daily_insights
from oracle import get_oracle_insight, get_all_oracle_insights, check_proactive_intervention


# Create blueprint
insights_bp = Blueprint('insights', __name__)

# Session factory will be set by app.py
Session = None

def init_insights_routes(session_factory):
    """Initialize the blueprint with the database session factory."""
    global Session
    Session = session_factory


# ============================================================================
# DAILY INSIGHTS
# ============================================================================

@insights_bp.route('/api/insights/daily', methods=['GET'])
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
        context = build_insight_context(session, user.id)
        insight = generate_daily_insights(activities_data, context=context)
        
        return jsonify({
            "date": target_date.isoformat(),
            "insight": insight,
            "activity_count": len(activities)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# ORACLE
# ============================================================================

@insights_bp.route('/api/oracle', methods=['GET'])
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
            context = build_insight_context(session, user.id)
            msg = f"Log {5 - len(activities)} more activities to unlock personalized AI insights about your productivity patterns."
            if context.get("active_goals"):
                msg = f"You have {len(context['active_goals'])} goal(s) set. " + msg
            return jsonify({
                "title": "🔮 The Oracle Awaits",
                "message": msg,
                "icon": "Sparkles",
                "type": "neutral",
                "cold_start": True,
                "activities_needed": 5 - len(activities)
            })
        
        # Generate insights (with context for personalization)
        context = build_insight_context(session, user.id)
        if full_mode:
            result = get_all_oracle_insights(activities, context=context)
        else:
            result = get_oracle_insight(activities, context=context)
        
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@insights_bp.route('/api/oracle/proactive', methods=['GET'])
def get_proactive_intervention():
    """Check if user needs a proactive Oracle intervention."""
    session = Session()
    try:
        user = get_current_user(session)
        tz_offset = request.args.get('tz_offset', 0, type=int)
        
        # Get today's activities
        cutoff = datetime.utcnow() - timedelta(hours=24)
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= cutoff
        ).order_by(ActivityLog.timestamp.asc()).all()
        
        intervention = check_proactive_intervention(activities, tz_offset)
        
        return jsonify({
            "intervention": intervention
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# HEATMAP
# ============================================================================

@insights_bp.route('/api/activities/heatmap', methods=['GET'])
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
# MORNING CHECK-IN
# ============================================================================

@insights_bp.route('/api/morning-checkin', methods=['GET'])
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
