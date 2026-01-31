"""
FocusFlow - Flask Application
Main API server for the Smart Productivity Tracker
Refactored: All endpoints moved to modular blueprints in routes/
"""

import os
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv

from models import User, init_db
from auth import auth_bp, init_auth_routes, get_user_from_token

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

# Initialize and register activities blueprint
from routes.activities import activities_bp, init_activities_routes
init_activities_routes(Session)
app.register_blueprint(activities_bp)

# Initialize and register insights blueprint
from routes.insights import insights_bp, init_insights_routes
init_insights_routes(Session)
app.register_blueprint(insights_bp)

# Initialize and register goals blueprint
from routes.goals import goals_bp, init_goals_routes
init_goals_routes(Session)
app.register_blueprint(goals_bp)

# Initialize and register social blueprint
from routes.social import social_bp, init_social_routes
init_social_routes(Session)
app.register_blueprint(social_bp)

# Initialize and register challenges blueprint
from routes.challenges import challenges_bp, init_challenges_routes
init_challenges_routes(Session)
app.register_blueprint(challenges_bp)

# Initialize and register gamification blueprint
from routes.gamification import gamification_bp, init_gamification_routes
init_gamification_routes(Session)
app.register_blueprint(gamification_bp)

# Initialize and register profile blueprint
from routes.profile import profile_bp, init_profile_routes
init_profile_routes(Session)
app.register_blueprint(profile_bp)

# Initialize and register analytics blueprint
from routes.analytics import analytics_bp, init_analytics_routes
init_analytics_routes(Session)
app.register_blueprint(analytics_bp)


@app.before_request
def load_logged_in_user():
    """
    Check for Authorization header before every request.
    If a valid token exists, set g.user_id so get_current_user() finds the real user.
    """
    auth_header = request.headers.get('Authorization')
    g.user_id = None  # Default to None

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
# INTERVENTION / WATCHER SYSTEM (Phase 4)
# These endpoints are for the desktop watcher script and remain in app.py
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
# MAIN ENTRY POINT
# ============================================================================

if __name__ == '__main__':
    print("Starting FocusFlow API Server (Phase 5 - Refactored)...")
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
