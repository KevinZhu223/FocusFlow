"""
FocusFlow - Analytics Blueprint
Handles deep analytics endpoints.
"""

from datetime import datetime
from flask import Blueprint, request, jsonify, Response

from models import ActivityLog
from utils import get_current_user
from auth import require_auth
from analytics import (
    get_productivity_insights, get_productivity_heatmap,
    get_trend_analysis, export_to_csv, get_full_analytics
)
from ml_engine import analyze_work_modes


# Create blueprint
analytics_bp = Blueprint('analytics', __name__)

# Session factory will be set by app.py
Session = None

def init_analytics_routes(session_factory):
    """Initialize the blueprint with the database session factory."""
    global Session
    Session = session_factory


# ============================================================================
# DEEP DATA ANALYTICS
# ============================================================================

@analytics_bp.route('/api/analytics/full', methods=['GET'])
@require_auth
def get_analytics_full():
    """Get all analytics data for the analytics page."""
    tz_offset = request.args.get('tz_offset', type=int, default=0)
    session = Session()
    try:
        user = get_current_user(session)
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).order_by(ActivityLog.timestamp.desc()).all()
        
        analytics = get_full_analytics(activities, tz_offset=tz_offset)
        
        return jsonify(analytics)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@analytics_bp.route('/api/analytics/insights', methods=['GET'])
@require_auth
def get_analytics_insights():
    """Get actionable productivity insights."""
    session = Session()
    try:
        user = get_current_user(session)
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).all()
        
        result = get_productivity_insights(activities)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@analytics_bp.route('/api/analytics/heatmap', methods=['GET'])
@require_auth
def get_analytics_heatmap():
    """Get productivity heatmap data (7 days x 24 hours)."""
    session = Session()
    try:
        user = get_current_user(session)
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).all()
        
        result = get_productivity_heatmap(activities)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@analytics_bp.route('/api/analytics/trends', methods=['GET'])
@require_auth
def get_analytics_trends():
    """Get trend analysis with rolling averages."""
    session = Session()
    try:
        user = get_current_user(session)
        
        days = request.args.get('days', 30, type=int)
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).all()
        
        result = get_trend_analysis(activities, days=days)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@analytics_bp.route('/api/analytics/export', methods=['GET'])
@require_auth
def export_analytics_csv():
    """Export user's activity data as CSV download."""
    session = Session()
    try:
        user = get_current_user(session)
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).order_by(ActivityLog.timestamp.desc()).all()
        
        csv_content = export_to_csv(activities)
        
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=focusflow_export_{datetime.now().strftime("%Y%m%d")}.csv'
            }
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@analytics_bp.route('/api/analytics/work-modes', methods=['GET'])
@require_auth
def get_work_modes_analysis():
    """Get Work Mode clustering analysis (Flow State Fingerprinting)."""
    session = Session()
    try:
        user = get_current_user(session)
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).all()
        
        result = analyze_work_modes(activities)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
