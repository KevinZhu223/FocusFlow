"""
FocusFlow - Social Blueprint
Handles friends, leaderboard, seasons, and notifications.
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify

from models import User, ActivityLog, Friendship, FriendshipStatusEnum, Season
from utils import get_current_user

# Optional: simple TTL cache for get_leaderboard (index on ActivityLog.category is priority)
_leaderboard_cache = {}
_LEADERBOARD_CACHE_TTL_SECONDS = 60


def _get_cached_leaderboard(cache_key):
    """Return cached result if still valid."""
    now = datetime.utcnow()
    if cache_key in _leaderboard_cache:
        cached_at, result = _leaderboard_cache[cache_key]
        if (now - cached_at).total_seconds() < _LEADERBOARD_CACHE_TTL_SECONDS:
            return result
    return None


def _set_leaderboard_cache(cache_key, result):
    """Store result in cache."""
    _leaderboard_cache[cache_key] = (datetime.utcnow(), result)


# Create blueprint
social_bp = Blueprint('social', __name__)

# Session factory will be set by app.py
Session = None

def init_social_routes(session_factory):
    """Initialize the blueprint with the database session factory."""
    global Session
    Session = session_factory


# ============================================================================
# LEADERBOARD
# ============================================================================

@social_bp.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get top 10 public users by weekly score. Cached briefly for performance."""
    tz_offset = request.args.get('tz_offset', type=int, default=0)
    now_utc = datetime.utcnow()
    user_local_datetime = now_utc - timedelta(minutes=tz_offset)
    today = user_local_datetime.date()
    start_of_week = today - timedelta(days=today.weekday())
    cache_key = (start_of_week.isoformat(), tz_offset)
    cached = _get_cached_leaderboard(cache_key)
    if cached is not None:
        return jsonify(cached)

    session = Session()
    try:
        start_datetime_local = datetime.combine(start_of_week, datetime.min.time())
        start_datetime_utc = start_datetime_local + timedelta(minutes=tz_offset)
        
        public_users = session.query(User).filter(User.is_public == True).all()
        
        leaderboard = []
        for user in public_users:
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
        
        leaderboard.sort(key=lambda x: x["weekly_score"], reverse=True)
        
        for i, entry in enumerate(leaderboard[:10]):
            entry["rank"] = i + 1
        
        result = {
            "week_start": start_of_week.isoformat(),
            "leaderboard": leaderboard[:10]
        }
        _set_leaderboard_cache(cache_key, result)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# SEASONS
# ============================================================================

@social_bp.route('/api/seasons/current', methods=['GET'])
def get_current_season():
    """Get the current active season info."""
    session = Session()
    try:
        season = session.query(Season).filter(Season.is_active == True).first()
        
        if not season:
            return jsonify({
                "season": None,
                "message": "No active season. Check back soon!"
            })
        
        now = datetime.utcnow()
        time_remaining = (season.end_date - now).total_seconds() if season.end_date > now else 0
        
        return jsonify({
            "season": season.to_dict(),
            "time_remaining_seconds": time_remaining,
            "days_remaining": int(time_remaining / 86400)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@social_bp.route('/api/seasons/leaderboard', methods=['GET'])
def get_season_leaderboard():
    """Get the global leaderboard for the current season."""
    session = Session()
    try:
        user = get_current_user(session)
        
        season = session.query(Season).filter(Season.is_active == True).first()
        
        if not season:
            return jsonify({
                "season": None,
                "leaderboard": [],
                "message": "No active season"
            })
        
        public_users = session.query(User).filter(User.is_public == True).all()
        
        leaderboard = []
        for u in public_users:
            activities = session.query(ActivityLog).filter(
                ActivityLog.user_id == u.id,
                ActivityLog.timestamp >= season.start_date,
                ActivityLog.timestamp <= season.end_date
            ).all()
            
            season_score = sum(a.productivity_score for a in activities)
            
            leaderboard.append({
                "user_id": u.id,
                "name": u.name,
                "level": u.level,
                "avatar_color": u.avatar_color or "#6366f1",
                "score": round(season_score, 2),
                "activities_count": len(activities),
                "is_you": u.id == user.id
            })
        
        leaderboard.sort(key=lambda x: x["score"], reverse=True)
        for i, entry in enumerate(leaderboard):
            entry["rank"] = i + 1
        
        user_rank = next((e["rank"] for e in leaderboard if e["is_you"]), None)
        
        return jsonify({
            "season": season.to_dict(),
            "leaderboard": leaderboard[:100],
            "user_rank": user_rank,
            "total_participants": len(leaderboard)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# NOTIFICATIONS
# ============================================================================

@social_bp.route('/api/notifications/count', methods=['GET'])
def get_notification_counts():
    """Get counts of pending friend requests and challenge invites for badge display."""
    from models import Challenge, ChallengeStatusEnum
    
    session = Session()
    try:
        user = get_current_user(session)
        
        pending_friends = session.query(Friendship).filter(
            Friendship.friend_id == user.id,
            Friendship.status == FriendshipStatusEnum.PENDING
        ).count()
        
        pending_challenges = session.query(Challenge).filter(
            Challenge.opponent_id == user.id,
            Challenge.status == ChallengeStatusEnum.PENDING
        ).count()
        
        return jsonify({
            "pending_friends": pending_friends,
            "pending_challenges": pending_challenges,
            "total": pending_friends + pending_challenges
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


# ============================================================================
# FRIENDS
# ============================================================================

@social_bp.route('/api/friends', methods=['GET'])
def get_friends():
    """Get all friends and pending requests for the current user."""
    session = Session()
    try:
        user = get_current_user(session)
        
        friends_as_requester = session.query(Friendship).filter(
            Friendship.user_id == user.id,
            Friendship.status == FriendshipStatusEnum.ACCEPTED
        ).all()
        
        friends_as_receiver = session.query(Friendship).filter(
            Friendship.friend_id == user.id,
            Friendship.status == FriendshipStatusEnum.ACCEPTED
        ).all()
        
        pending_received = session.query(Friendship).filter(
            Friendship.friend_id == user.id,
            Friendship.status == FriendshipStatusEnum.PENDING
        ).all()
        
        pending_sent = session.query(Friendship).filter(
            Friendship.user_id == user.id,
            Friendship.status == FriendshipStatusEnum.PENDING
        ).all()
        
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


@social_bp.route('/api/friends/request', methods=['POST'])
def send_friend_request():
    """Send a friend request by email or username."""
    data = request.get_json()
    identifier = data.get('identifier', '').strip() if data else None
    if not identifier:
        identifier = data.get('email', '').strip() if data else None
    
    if not identifier:
        return jsonify({"error": "Email or username is required"}), 400
    
    session = Session()
    try:
        user = get_current_user(session)
        
        is_email = '@' in identifier
        
        if is_email:
            if user.email.lower() == identifier.lower():
                return jsonify({"error": "Cannot send friend request to yourself"}), 400
            
            target_user = session.query(User).filter(
                User.email.ilike(identifier)
            ).first()
        else:
            if user.name.lower() == identifier.lower():
                return jsonify({"error": "Cannot send friend request to yourself"}), 400
            
            target_user = session.query(User).filter(
                User.name.ilike(identifier)
            ).first()
        
        if not target_user:
            return jsonify({"error": f"User not found with {'email' if is_email else 'username'}: {identifier}"}), 404
        
        existing = session.query(Friendship).filter(
            ((Friendship.user_id == user.id) & (Friendship.friend_id == target_user.id)) |
            ((Friendship.user_id == target_user.id) & (Friendship.friend_id == user.id))
        ).first()
        
        if existing:
            if existing.status == FriendshipStatusEnum.ACCEPTED:
                return jsonify({"error": "Already friends with this user"}), 400
            else:
                return jsonify({"error": "Friend request already pending"}), 400
        
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


@social_bp.route('/api/friends/accept', methods=['POST'])
def accept_friend_request():
    """Accept a pending friend request."""
    data = request.get_json()
    friendship_id = data.get('friendship_id') if data else None
    
    if not friendship_id:
        return jsonify({"error": "friendship_id is required"}), 400
    
    session = Session()
    try:
        user = get_current_user(session)
        
        friendship = session.query(Friendship).filter(
            Friendship.id == friendship_id,
            Friendship.friend_id == user.id,
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


@social_bp.route('/api/friends/<int:friendship_id>', methods=['DELETE'])
def remove_friend(friendship_id):
    """Remove a friend or decline a request."""
    session = Session()
    try:
        user = get_current_user(session)
        
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
