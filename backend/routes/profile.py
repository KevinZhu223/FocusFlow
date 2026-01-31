"""
FocusFlow - Profile Blueprint
Handles user profile CRUD, public profiles, and data export.
"""

import csv
import io
from datetime import datetime
from flask import Blueprint, request, jsonify, Response
from sqlalchemy import func

from models import ActivityLog, UserBadge, Badge, User, Friendship, FriendshipStatusEnum
from utils import get_current_user
from gamification import get_level_progress


# Create blueprint
profile_bp = Blueprint('profile', __name__)

# Session factory will be set by app.py
Session = None

def init_profile_routes(session_factory):
    """Initialize the blueprint with the database session factory."""
    global Session
    Session = session_factory


# ============================================================================
# USER PROFILE
# ============================================================================

@profile_bp.route('/api/user/profile', methods=['GET'])
def get_profile():
    """Get current user's full profile including badges."""
    session = Session()
    try:
        user = get_current_user(session)
        
        user_badges = session.query(UserBadge).filter(
            UserBadge.user_id == user.id
        ).all()
        
        badges = [ub.to_dict() for ub in user_badges]
        
        level_info = get_level_progress(user.xp)
        
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


@profile_bp.route('/api/user/profile', methods=['PUT'])
def update_profile():
    """Update user profile (bio, avatar_color, is_public)."""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Missing request body"}), 400
    
    session = Session()
    try:
        user = get_current_user(session)
        
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
# PUBLIC PROFILE
# ============================================================================

@profile_bp.route('/api/users/<int:user_id>/profile', methods=['GET'])
def get_user_public_profile(user_id):
    """Get public profile of another user (for friends/leaderboard viewing)."""
    session = Session()
    try:
        current_user = get_current_user(session)
        
        target_user = session.query(User).filter(User.id == user_id).first()
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        
        is_self = current_user.id == user_id
        
        is_friend = False
        if not is_self:
            friendship = session.query(Friendship).filter(
                ((Friendship.user_id == current_user.id) & (Friendship.friend_id == user_id)) |
                ((Friendship.user_id == user_id) & (Friendship.friend_id == current_user.id)),
                Friendship.status == FriendshipStatusEnum.ACCEPTED
            ).first()
            is_friend = friendship is not None
        
        can_view = is_self or target_user.is_public or is_friend
        
        if not can_view:
            return jsonify({
                "user": {
                    "id": target_user.id,
                    "name": target_user.name,
                    "avatar_color": target_user.avatar_color or "#6366f1",
                    "is_public": False
                },
                "is_private": True,
                "message": "This user's profile is private"
            })
        
        level_info = get_level_progress(target_user.xp)
        
        total_activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user_id
        ).count()
        
        total_score = session.query(func.sum(ActivityLog.productivity_score)).filter(
            ActivityLog.user_id == user_id
        ).scalar() or 0
        
        user_badges = session.query(UserBadge).filter(
            UserBadge.user_id == user_id
        ).all()
        badges = [ub.to_dict() for ub in user_badges]
        
        return jsonify({
            "user": {
                "id": target_user.id,
                "name": target_user.name,
                "bio": target_user.bio,
                "avatar_color": target_user.avatar_color or "#6366f1",
                "level": target_user.level,
                "xp": target_user.xp,
                "is_public": target_user.is_public,
                "created_at": target_user.created_at.isoformat() if target_user.created_at else None
            },
            "level_progress": level_info,
            "badges": badges,
            "stats": {
                "total_activities": total_activities,
                "total_score": round(total_score, 2),
                "member_since": target_user.created_at.isoformat() if target_user.created_at else None
            },
            "is_friend": is_friend,
            "is_self": is_self
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# DATA EXPORT
# ============================================================================

@profile_bp.route('/api/user/export_data', methods=['GET'])
def export_data():
    """Export all user activity data as CSV."""
    session = Session()
    try:
        user = get_current_user(session)
        
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        ).order_by(ActivityLog.timestamp.desc()).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            'Timestamp', 'Activity', 'Category', 'Duration (min)',
            'Productivity Score', 'Focus Session', 'Raw Input'
        ])
        
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
