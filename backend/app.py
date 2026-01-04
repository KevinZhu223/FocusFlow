"""
FocusFlow - Flask Application
Main API server for the Smart Productivity Tracker
"""

import os
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from sqlalchemy import func
from dotenv import load_dotenv

from models import Base, User, ActivityLog, CategoryEnum, init_db
from nlp_parser import parse_activity, generate_daily_insights
from auth import auth_bp, init_auth_routes, require_auth

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


def get_or_create_demo_user(session):
    """Get or create a demo user for MVP testing"""
    user = session.query(User).filter_by(email="demo@focusflow.app").first()
    if not user:
        user = User(
            email="demo@focusflow.app",
            name="Demo User"
        )
        session.add(user)
        session.commit()
    return user


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "FocusFlow API"})


@app.route('/api/log_activity', methods=['POST'])
def log_activity():
    """
    Log a new activity from natural language input.
    
    Request Body:
        {
            "text": "Studied for 2 hours"
        }
    
    Returns:
        The created activity log entry
    """
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({"error": "Missing 'text' field in request body"}), 400
    
    text = data['text'].strip()
    if not text:
        return jsonify({"error": "Text cannot be empty"}), 400
    
    # Parse the activity using NLP
    parsed = parse_activity(text)
    
    session = Session()
    try:
        # Get demo user (in production, this would use authenticated user)
        user = get_or_create_demo_user(session)
        
        # Create activity log entry
        activity = ActivityLog(
            user_id=user.id,
            raw_input=text,
            activity_name=parsed['activity_name'],
            category=parsed['category'],
            duration_minutes=parsed['duration_minutes'],
            sentiment_score=parsed['sentiment_score'],
            productivity_score=parsed['productivity_score'],
            timestamp=datetime.utcnow()
        )
        
        session.add(activity)
        session.commit()
        
        return jsonify({
            "success": True,
            "activity": activity.to_dict()
        }), 201
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/activities', methods=['GET'])
def get_activities():
    """
    Get activities for the current user.
    
    Query Parameters:
        - date: Filter by date (YYYY-MM-DD), defaults to today
        - limit: Maximum number of results (default 50)
    
    Returns:
        List of activity log entries
    """
    # Parse query parameters
    date_str = request.args.get('date')
    limit = min(int(request.args.get('limit', 50)), 100)
    
    session = Session()
    try:
        user = get_or_create_demo_user(session)
        
        query = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id
        )
        
        # Filter by date if specified
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            target_date = datetime.utcnow().date()
        
        # Filter for activities on the target date
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = start_of_day + timedelta(days=1)
        
        query = query.filter(
            ActivityLog.timestamp >= start_of_day,
            ActivityLog.timestamp < end_of_day
        )
        
        # Order by timestamp descending (most recent first)
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


@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """
    Get dashboard statistics for the current user.
    
    Query Parameters:
        - date: Date for stats (YYYY-MM-DD), defaults to today
    
    Returns:
        Dashboard data including:
        - daily_score: Sum of all productivity scores
        - category_breakdown: Time spent by category
        - activity_count: Number of activities logged
    """
    date_str = request.args.get('date')
    
    session = Session()
    try:
        user = get_or_create_demo_user(session)
        
        # Determine target date
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            target_date = datetime.utcnow().date()
        
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = start_of_day + timedelta(days=1)
        
        # Get activities for the day
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= start_of_day,
            ActivityLog.timestamp < end_of_day
        ).all()
        
        # Calculate daily score
        daily_score = sum(a.productivity_score for a in activities)
        
        # Calculate category breakdown (time in minutes)
        category_breakdown = {}
        for category in CategoryEnum:
            category_activities = [a for a in activities if a.category == category]
            total_minutes = sum(
                a.duration_minutes or 30  # Default to 30 min if not specified
                for a in category_activities
            )
            if total_minutes > 0:
                category_breakdown[category.value] = {
                    "minutes": total_minutes,
                    "count": len(category_activities)
                }
        
        # Calculate average sentiment
        sentiments = [a.sentiment_score for a in activities if a.sentiment_score is not None]
        avg_sentiment = round(sum(sentiments) / len(sentiments), 2) if sentiments else 0
        
        return jsonify({
            "date": target_date.isoformat(),
            "daily_score": daily_score,
            "activity_count": len(activities),
            "average_sentiment": avg_sentiment,
            "category_breakdown": category_breakdown
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
        user = get_or_create_demo_user(session)
        
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


@app.route('/api/insights/daily', methods=['GET'])
def get_daily_insights():
    """
    Get AI-generated daily coaching insights.
    
    Returns:
        2-sentence coach insight based on today's activities
    """
    date_str = request.args.get('date')
    
    session = Session()
    try:
        # Get user (authenticated or demo)
        user_id = getattr(g, 'user_id', None)
        if user_id:
            user = session.query(User).filter_by(id=user_id).first()
        else:
            user = get_or_create_demo_user(session)
        
        # Determine target date
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            target_date = datetime.utcnow().date()
        
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = start_of_day + timedelta(days=1)
        
        # Get activities for the day
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= start_of_day,
            ActivityLog.timestamp < end_of_day
        ).all()
        
        # Convert to dicts for the insights generator
        activities_data = [a.to_dict() for a in activities]
        
        # Generate insights using LLM
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
    """
    Get activity data for the last 365 days for heatmap visualization.
    
    Returns:
        List of { date, count, score } for each day with activity
    """
    session = Session()
    try:
        # Get user (authenticated or demo)
        user_id = getattr(g, 'user_id', None)
        if user_id:
            user = session.query(User).filter_by(id=user_id).first()
        else:
            user = get_or_create_demo_user(session)
        
        # Calculate date range (last 365 days)
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=365)
        
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date + timedelta(days=1), datetime.min.time())
        
        # Get all activities in range
        activities = session.query(ActivityLog).filter(
            ActivityLog.user_id == user.id,
            ActivityLog.timestamp >= start_datetime,
            ActivityLog.timestamp < end_datetime
        ).all()
        
        # Aggregate by date
        daily_data = {}
        for activity in activities:
            date_key = activity.timestamp.date().isoformat()
            if date_key not in daily_data:
                daily_data[date_key] = {"count": 0, "score": 0}
            daily_data[date_key]["count"] += 1
            daily_data[date_key]["score"] += activity.productivity_score or 0
        
        # Convert to list format
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


if __name__ == '__main__':
    print("Starting FocusFlow API Server...")
    print(f"Database: {DATABASE_URL}")
    app.run(debug=True, host='0.0.0.0', port=5000)
