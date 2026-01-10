"""
FocusFlow - The Oracle
Phase 7: Prescriptive Analytics Engine
Uses Pandas to analyze user activity history and provide actionable workflow advice.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional


def activities_to_dataframe(activities: List[Any]) -> pd.DataFrame:
    """
    Convert SQLAlchemy ActivityLog objects to a Pandas DataFrame.
    
    Args:
        activities: List of ActivityLog objects
        
    Returns:
        DataFrame with activity data enriched with temporal features
    """
    if not activities:
        return pd.DataFrame()
    
    data = []
    for activity in activities:
        data.append({
            'id': activity.id,
            'activity_name': activity.activity_name,
            'category': activity.category.value if activity.category else None,
            'duration_minutes': activity.duration_minutes or 30,
            'productivity_score': activity.productivity_score or 0,
            'sentiment_score': activity.sentiment_score or 0,
            'is_focus_session': bool(activity.is_focus_session),
            'timestamp': activity.timestamp
        })
    
    df = pd.DataFrame(data)
    
    # Enrich with temporal features
    df['hour_of_day'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek  # Monday=0, Sunday=6
    df['day_name'] = df['timestamp'].dt.day_name()
    df['date'] = df['timestamp'].dt.date
    
    return df


def analyze_chronotype(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Chronotype Analysis - Find the user's "Golden Hour" for peak productivity.
    
    Groups activities by hour and finds the time with highest average productivity.
    """
    if df.empty or 'productivity_score' not in df.columns:
        return None
    
    # Group by hour and calculate average productivity
    hourly_stats = df.groupby('hour_of_day').agg({
        'productivity_score': ['mean', 'count']
    }).round(2)
    
    hourly_stats.columns = ['avg_score', 'activity_count']
    hourly_stats = hourly_stats.reset_index()
    
    # Filter hours with at least 2 activities for statistical significance
    significant_hours = hourly_stats[hourly_stats['activity_count'] >= 2]
    
    if significant_hours.empty:
        return None
    
    # Find peak hour
    peak_row = significant_hours.loc[significant_hours['avg_score'].idxmax()]
    peak_hour = int(peak_row['hour_of_day'])
    peak_score = float(peak_row['avg_score'])
    
    # Format hour nicely
    if peak_hour == 0:
        hour_str = "12 AM"
    elif peak_hour < 12:
        hour_str = f"{peak_hour} AM"
    elif peak_hour == 12:
        hour_str = "12 PM"
    else:
        hour_str = f"{peak_hour - 12} PM"
    
    # Determine insight type based on score
    if peak_score >= 5:
        message = f"You're statistically sharpest around {hour_str} with a +{peak_score:.1f} avg productivity score. Schedule your most challenging deep work during this window for maximum impact."
    elif peak_score >= 2:
        message = f"Your peak performance window is around {hour_str} (avg +{peak_score:.1f} score). Try protecting this time for focused work to boost your output."
    else:
        message = f"You tend to be more productive around {hour_str}. Consider scheduling important tasks during this window."
    
    return {
        "title": "⚡ Golden Hour Detected",
        "message": message,
        "icon": "Zap",
        "type": "positive",
        "priority": peak_score,  # Higher scores get higher priority
        "data": {
            "peak_hour": peak_hour,
            "peak_score": peak_score,
            "hour_str": hour_str
        }
    }


def analyze_weak_link(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Weak Link Detector - Find the day of week with lowest productivity.
    
    Identifies patterns in weekly performance to help users optimize their schedule.
    """
    if df.empty or 'productivity_score' not in df.columns:
        return None
    
    # Group by day of week
    daily_stats = df.groupby(['day_of_week', 'day_name']).agg({
        'productivity_score': ['mean', 'count']
    }).round(2)
    
    daily_stats.columns = ['avg_score', 'activity_count']
    daily_stats = daily_stats.reset_index()
    
    # Filter days with at least 2 activities
    significant_days = daily_stats[daily_stats['activity_count'] >= 2]
    
    if len(significant_days) < 2:  # Need at least 2 days for comparison
        return None
    
    # Find weakest day
    weak_row = significant_days.loc[significant_days['avg_score'].idxmin()]
    weak_day = weak_row['day_name']
    weak_score = float(weak_row['avg_score'])
    
    # Find strongest day for comparison
    strong_row = significant_days.loc[significant_days['avg_score'].idxmax()]
    strong_day = strong_row['day_name']
    strong_score = float(strong_row['avg_score'])
    
    # Calculate the gap
    gap = strong_score - weak_score
    
    # Only flag if there's a meaningful difference (>15%)
    if gap < 0.15:
        return None
    
    if weak_score < 0.4:
        message = f"⚠️ {weak_day}s are your productivity blind spot ({weak_score:.0%} avg). Consider scheduling lighter admin tasks or recovery time instead of deep work."
    else:
        message = f"Your {weak_day}s ({weak_score:.0%}) tend to lag behind {strong_day}s ({strong_score:.0%}). Plan accordingly to protect your streak."
    
    return {
        "title": "🔍 Weak Link Detected",
        "message": message,
        "icon": "Shield",
        "type": "warning",
        "priority": 1 - weak_score,  # Lower scores get higher priority
        "data": {
            "weak_day": weak_day,
            "weak_score": weak_score,
            "strong_day": strong_day,
            "strong_score": strong_score,
            "gap": gap
        }
    }


def analyze_consistency(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Consistency Check - Analyze energy volatility over the last 7 days.
    
    Uses standard deviation of daily productivity to assess rhythm stability.
    """
    if df.empty:
        return None
    
    # Filter to last 7 days
    cutoff = datetime.now() - timedelta(days=7)
    recent_df = df[df['timestamp'] >= cutoff]
    
    if len(recent_df) < 3:  # Need at least 3 data points
        return None
    
    # Calculate daily totals
    daily_scores = recent_df.groupby('date').agg({
        'productivity_score': 'sum',
        'id': 'count'
    }).rename(columns={'id': 'activity_count'})
    
    if len(daily_scores) < 2:
        return None
    
    # Calculate statistics
    mean_score = daily_scores['productivity_score'].mean()
    std_dev = daily_scores['productivity_score'].std()
    cv = std_dev / mean_score if mean_score > 0 else 0  # Coefficient of variation
    
    # Also check activity count consistency
    activity_std = daily_scores['activity_count'].std()
    avg_activities = daily_scores['activity_count'].mean()
    
    # Determine insight based on volatility
    if cv < 0.3:  # Low volatility = consistent
        return {
            "title": "🎯 Rock-Solid Rhythm",
            "message": f"Your productivity has been remarkably consistent this week (±{std_dev:.1f} variation). This stability is the foundation of sustainable performance. Keep it up!",
            "icon": "TrendingUp",
            "type": "positive",
            "priority": 0.8,
            "data": {
                "mean_score": mean_score,
                "std_dev": std_dev,
                "cv": cv,
                "days_analyzed": len(daily_scores)
            }
        }
    elif cv < 0.6:  # Moderate volatility
        return {
            "title": "📊 Moderate Variance",
            "message": f"Your daily output varies moderately (±{std_dev:.1f}). Consider establishing stronger daily rituals to smooth out the peaks and valleys.",
            "icon": "Activity",
            "type": "neutral",
            "priority": 0.5,
            "data": {
                "mean_score": mean_score,
                "std_dev": std_dev,
                "cv": cv
            }
        }
    else:  # High volatility
        return {
            "title": "⚠️ Energy Volatility",
            "message": f"Your productivity swings wildly (±{std_dev:.1f} daily). This often signals inconsistent sleep, nutrition, or workload. Try stabilizing your morning routine first.",
            "icon": "AlertTriangle",
            "type": "warning",
            "priority": 0.9,
            "data": {
                "mean_score": mean_score,
                "std_dev": std_dev,
                "cv": cv
            }
        }


def analyze_category_balance(df: pd.DataFrame) -> Dict[str, Any]:
    """
    BONUS: Category Balance Analysis - Check if work-life balance is healthy.
    
    Analyzes time distribution across categories to flag imbalances.
    """
    if df.empty or 'category' not in df.columns:
        return None
    
    # Calculate time spent per category
    category_time = df.groupby('category')['duration_minutes'].sum()
    total_time = category_time.sum()
    
    if total_time < 60:  # Need at least 1 hour of data
        return None
    
    category_pct = (category_time / total_time * 100).round(1)
    
    # Check for imbalances
    career_pct = category_pct.get('Career', 0)
    leisure_pct = category_pct.get('Leisure', 0)
    health_pct = category_pct.get('Health', 0)
    
    # Flag workaholic pattern
    if career_pct > 70 and leisure_pct < 10:
        return {
            "title": "🔥 Burnout Risk",
            "message": f"Career activities dominate at {career_pct:.0f}% with only {leisure_pct:.0f}% leisure. Consider scheduling deliberate breaks to prevent burnout.",
            "icon": "Flame",
            "type": "warning",
            "priority": 0.85,
            "data": category_pct.to_dict()
        }
    
    # Flag all-play pattern
    if leisure_pct > 60 and career_pct < 20:
        return {
            "title": "🎮 Balance Check",
            "message": f"Leisure activities are at {leisure_pct:.0f}%. If you have goals pending, consider allocating more focused career time.",
            "icon": "Gamepad2",
            "type": "neutral",
            "priority": 0.6,
            "data": category_pct.to_dict()
        }
    
    # Flag missing health activities
    if health_pct < 5 and total_time > 300:  # 5+ hours logged but no health
        return {
            "title": "💪 Health Reminder",
            "message": "Your logs show minimal health activities. Even 15 minutes of movement can boost cognitive performance significantly.",
            "icon": "Heart",
            "type": "neutral",
            "priority": 0.4,
            "data": category_pct.to_dict()
        }
    
    return None


def analyze_focus_sessions(df: pd.DataFrame) -> Dict[str, Any]:
    """
    BONUS: Focus Session Analysis - Track deep work patterns.
    """
    if df.empty or 'is_focus_session' not in df.columns:
        return None
    
    focus_sessions = df[df['is_focus_session'] == True]
    total_sessions = len(df)
    focus_count = len(focus_sessions)
    
    if total_sessions < 5:
        return None
    
    focus_ratio = focus_count / total_sessions
    
    if focus_ratio >= 0.3:
        avg_focus_duration = focus_sessions['duration_minutes'].mean() if not focus_sessions.empty else 0
        return {
            "title": "🧘 Deep Work Champion",
            "message": f"{focus_ratio:.0%} of your sessions are focused deep work. You're building valuable neural pathways for complex thinking.",
            "icon": "Brain",
            "type": "positive",
            "priority": 0.7,
            "data": {
                "focus_ratio": focus_ratio,
                "avg_focus_duration": avg_focus_duration
            }
        }
    elif focus_ratio < 0.1 and focus_count < 2:
        return {
            "title": "🎯 Focus Opportunity",
            "message": "Try labeling your next concentrated work session as 'deep focus' or 'flow state' to track your deep work capacity.",
            "icon": "Target",
            "type": "neutral",
            "priority": 0.3,
            "data": {
                "focus_ratio": focus_ratio
            }
        }
    
    return None


def get_oracle_insights(activities: List[Any]) -> List[Dict[str, Any]]:
    """
    Generate all available Oracle insights for a user.
    
    Args:
        activities: List of ActivityLog objects
        
    Returns:
        List of insight dictionaries sorted by priority
    """
    df = activities_to_dataframe(activities)
    
    if df.empty:
        return []
    
    # Run all analyses
    analyses = [
        analyze_chronotype(df),
        analyze_weak_link(df),
        analyze_consistency(df),
        analyze_category_balance(df),
        analyze_focus_sessions(df)
    ]
    
    # Filter out None results and sort by priority
    insights = [a for a in analyses if a is not None]
    insights.sort(key=lambda x: x.get('priority', 0), reverse=True)
    
    return insights


def get_oracle_insight(activities: List[Any]) -> Dict[str, Any]:
    """
    Get the single most relevant Oracle insight for a user.
    
    This is the main entry point called by the API.
    
    Args:
        activities: List of ActivityLog objects
        
    Returns:
        Single insight dictionary (the highest priority one)
    """
    insights = get_oracle_insights(activities)
    
    if not insights:
        return {
            "title": "🔮 The Oracle Awaits",
            "message": "Keep logging activities to unlock personalized AI insights about your productivity patterns.",
            "icon": "Sparkles",
            "type": "neutral",
            "cold_start": True
        }
    
    # Return the highest priority insight
    top_insight = insights[0]
    
    # Remove internal priority field from response
    if 'priority' in top_insight:
        del top_insight['priority']
    if 'data' in top_insight:
        del top_insight['data']  # Remove debug data from API response
    
    return top_insight


def get_all_oracle_insights(activities: List[Any]) -> Dict[str, Any]:
    """
    Get all Oracle insights for a user (for a detailed view).
    
    Returns:
        Dictionary with all insights and summary stats
    """
    df = activities_to_dataframe(activities)
    insights = get_oracle_insights(activities)
    
    # Clean insights for API response
    clean_insights = []
    for insight in insights:
        clean = {k: v for k, v in insight.items() if k not in ['priority', 'data']}
        clean_insights.append(clean)
    
    return {
        "insights": clean_insights,
        "total_activities": len(df),
        "date_range": {
            "start": df['timestamp'].min().isoformat() if not df.empty else None,
            "end": df['timestamp'].max().isoformat() if not df.empty else None
        }
    }
