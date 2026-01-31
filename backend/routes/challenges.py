"""
FocusFlow - Challenges Blueprint
Handles challenge CRUD and scoring.
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify

from models import Challenge, ChallengeStatusEnum, ActivityLog, CategoryEnum, TimeframeEnum
from utils import get_current_user


# Create blueprint
challenges_bp = Blueprint('challenges', __name__)

# Session factory will be set by app.py
Session = None

def init_challenges_routes(session_factory):
    """Initialize the blueprint with the database session factory."""
    global Session
    Session = session_factory


# ============================================================================
# CHALLENGES CRUD
# ============================================================================

@challenges_bp.route('/api/challenges', methods=['GET'])
def get_challenges():
    """Get all challenges for the current user (created or received)."""
    session = Session()
    try:
        user = get_current_user(session)
        
        challenges = session.query(Challenge).filter(
            (Challenge.creator_id == user.id) | (Challenge.opponent_id == user.id)
        ).order_by(Challenge.created_at.desc()).all()
        
        result = []
        for challenge in challenges:
            challenge_data = challenge.to_dict(include_users=True)
            
            if challenge.status == ChallengeStatusEnum.ACTIVE and challenge.start_date:
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
                
                if challenge.category:
                    creator_activities = creator_activities.filter(ActivityLog.category == challenge.category)
                    opponent_activities = opponent_activities.filter(ActivityLog.category == challenge.category)
                
                creator_score = sum(a.productivity_score for a in creator_activities.all())
                opponent_score = sum(a.productivity_score for a in opponent_activities.all())
                
                challenge.creator_score = creator_score
                challenge.opponent_score = opponent_score
                
                challenge_data['creator_score'] = creator_score
                challenge_data['opponent_score'] = opponent_score
                challenge_data['is_creator'] = challenge.creator_id == user.id
                challenge_data['my_score'] = creator_score if challenge.creator_id == user.id else opponent_score
                challenge_data['their_score'] = opponent_score if challenge.creator_id == user.id else creator_score
                
                if challenge.end_date and datetime.utcnow() >= challenge.end_date:
                    challenge.status = ChallengeStatusEnum.COMPLETED
                    challenge_data['status'] = 'completed'
                    
                    is_leisure_challenge = challenge.category == CategoryEnum.LEISURE
                    if is_leisure_challenge:
                        if creator_score < opponent_score:
                            challenge.winner_id = challenge.creator_id
                        elif opponent_score < creator_score:
                            challenge.winner_id = challenge.opponent_id
                    else:
                        if creator_score > opponent_score:
                            challenge.winner_id = challenge.creator_id
                        elif opponent_score > creator_score:
                            challenge.winner_id = challenge.opponent_id
                    challenge_data['winner_id'] = challenge.winner_id
            else:
                challenge_data['is_creator'] = challenge.creator_id == user.id
                challenge_data['my_score'] = challenge.creator_score if challenge.creator_id == user.id else challenge.opponent_score
                challenge_data['their_score'] = challenge.opponent_score if challenge.creator_id == user.id else challenge.creator_score
            
            result.append(challenge_data)
        
        session.commit()
        
        return jsonify({"challenges": result})
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@challenges_bp.route('/api/challenges', methods=['POST'])
def create_challenge():
    """Create a new challenge to send to a friend."""
    session = Session()
    try:
        user = get_current_user(session)
        data = request.get_json()
        
        opponent_id = data.get('opponent_id')
        title = data.get('title', 'Weekly Challenge')
        category = data.get('category')
        target_hours = data.get('target_hours', 5)
        timeframe = data.get('timeframe', 'weekly')
        
        if not opponent_id:
            return jsonify({"error": "opponent_id is required"}), 400
        
        if opponent_id == user.id:
            return jsonify({"error": "Cannot challenge yourself"}), 400
        
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


@challenges_bp.route('/api/challenges/<int:challenge_id>/accept', methods=['POST'])
def accept_challenge(challenge_id):
    """Accept a pending challenge."""
    session = Session()
    try:
        user = get_current_user(session)
        
        challenge = session.query(Challenge).get(challenge_id)
        
        if not challenge:
            return jsonify({"error": "Challenge not found"}), 404
        
        if challenge.opponent_id != user.id:
            return jsonify({"error": "Only the challenged user can accept"}), 403
        
        if challenge.status != ChallengeStatusEnum.PENDING:
            return jsonify({"error": "Challenge is not pending"}), 400
        
        now = datetime.utcnow()
        challenge.start_date = now
        
        if challenge.timeframe == TimeframeEnum.DAILY:
            challenge.end_date = now + timedelta(days=1)
        elif challenge.timeframe == TimeframeEnum.WEEKLY:
            challenge.end_date = now + timedelta(days=7)
        else:
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


@challenges_bp.route('/api/challenges/<int:challenge_id>/decline', methods=['POST'])
def decline_challenge(challenge_id):
    """Decline a pending challenge."""
    session = Session()
    try:
        user = get_current_user(session)
        
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


@challenges_bp.route('/api/challenges/active', methods=['GET'])
def get_active_challenges():
    """Get active challenges with current scores."""
    session = Session()
    try:
        user = get_current_user(session)
        
        challenges = session.query(Challenge).filter(
            (Challenge.creator_id == user.id) | (Challenge.opponent_id == user.id),
            Challenge.status == ChallengeStatusEnum.ACTIVE
        ).all()
        
        result = []
        for challenge in challenges:
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
            
            if challenge.category:
                creator_activities = creator_activities.filter(ActivityLog.category == challenge.category)
                opponent_activities = opponent_activities.filter(ActivityLog.category == challenge.category)
            
            creator_score = sum(a.productivity_score for a in creator_activities.all())
            opponent_score = sum(a.productivity_score for a in opponent_activities.all())
            
            challenge.creator_score = creator_score
            challenge.opponent_score = opponent_score
            
            if challenge.end_date and datetime.utcnow() >= challenge.end_date:
                challenge.status = ChallengeStatusEnum.COMPLETED
                
                is_leisure_challenge = challenge.category == CategoryEnum.LEISURE
                if is_leisure_challenge:
                    if creator_score < opponent_score:
                        challenge.winner_id = challenge.creator_id
                    elif opponent_score < creator_score:
                        challenge.winner_id = challenge.opponent_id
                else:
                    if creator_score > opponent_score:
                        challenge.winner_id = challenge.creator_id
                    elif opponent_score > creator_score:
                        challenge.winner_id = challenge.opponent_id
            
            result.append({
                **challenge.to_dict(include_users=True),
                "is_creator": challenge.creator_id == user.id,
                "my_score": creator_score if challenge.creator_id == user.id else opponent_score,
                "opponent_score": opponent_score if challenge.creator_id == user.id else creator_score,
                "time_remaining": (challenge.end_date - datetime.utcnow()).total_seconds() if challenge.end_date else None
            })
        
        session.commit()
        
        return jsonify({"active_challenges": result})
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
