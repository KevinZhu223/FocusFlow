"""
FocusFlow - ML Engine for Work Mode Analysis
Phase 9: Flow State Fingerprinting using K-Means Clustering

This module analyzes user activity patterns to identify distinct "Work Modes"
and provides actionable insights based on the clustering results.
"""

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta


# Work Mode Archetypes
WORK_MODES = {
    'deep_focus': {
        'name': '🚀 Deep Focus',
        'color': '#8884d8',  # Prestige Purple
        'description': 'Long, high-impact sessions where you enter the Zone',
        'action': 'Protect these time blocks at all costs!'
    },
    'quick_wins': {
        'name': '⚡ Quick Wins',
        'color': '#82ca9d',  # Success Green
        'description': 'Short bursts of highly productive work',
        'action': 'Great for momentum! Stack these in low-energy periods.'
    },
    'burnout_zone': {
        'name': '⚠️ The Grind',
        'color': '#ff7300',  # Warning Orange
        'description': 'Long sessions with diminishing returns',
        'action': 'Try the Pomodoro Timer to break up these marathons.'
    },
    'distracted': {
        'name': '🛑 Scattered',
        'color': '#999999',  # Gray
        'description': 'Short, low-value sessions',
        'action': 'Consider turning off notifications during work blocks.'
    }
}


def classify_cluster(avg_duration: float, avg_score: float, 
                     duration_median: float, score_median: float) -> str:
    """
    Classify a cluster centroid into a Work Mode archetype.
    Uses data-relative thresholds (medians) instead of hardcoded values.
    
    Logic:
    - High Duration (>median) + High Score (>median) → Deep Focus
    - Low Duration (<median) + High Score (>median) → Quick Wins
    - High Duration (>median) + Low Score (<median) → Burnout Zone
    - Low Duration (<median) + Low Score (<median) → Distracted
    """
    high_duration = avg_duration > duration_median
    high_score = avg_score > score_median
    
    if high_duration and high_score:
        return 'deep_focus'
    elif not high_duration and high_score:
        return 'quick_wins'
    elif high_duration and not high_score:
        return 'burnout_zone'
    else:
        return 'distracted'


def analyze_work_modes(activities: List[Any]) -> Dict[str, Any]:
    """
    Analyze user activities using K-Means clustering to identify Work Modes.
    
    Args:
        activities: List of ActivityLog objects
        
    Returns:
        Dict with chart_data, cluster_info, and insight
    """
    # Minimum data check
    if len(activities) < 5:
        return {
            'has_data': False,
            'message': 'Need at least 5 activities for Work Mode analysis',
            'chart_data': [],
            'clusters': [],
            'insight': None
        }
    
    # Step A: Data Preparation
    # IMPORTANT: Only analyze productive activities (Career, Health, Chores, Education)
    # Exclude Leisure and Social as they pollute work session analysis
    PRODUCTIVE_CATEGORIES = {'career', 'health', 'chores', 'education'}
    
    data = []
    for act in activities:
        duration = act.duration_minutes or 0
        score = act.productivity_score or 0
        category = act.category.value.lower() if hasattr(act.category, 'value') else str(act.category).lower()
        
        # Skip activities with no duration
        if duration <= 0:
            continue
        
        # Skip leisure and social activities - they shouldn't be in work analysis
        if category not in PRODUCTIVE_CATEGORIES:
            continue
            
        data.append({
            'id': act.id,
            'activity': act.activity_name or act.raw_input[:30],
            'duration': duration,
            'score': score,
            'category': category.capitalize(),
            'timestamp': act.timestamp.isoformat() if act.timestamp else None
        })
    
    if len(data) < 5:
        return {
            'has_data': False,
            'message': 'Need at least 5 activities with duration for analysis',
            'chart_data': [],
            'clusters': [],
            'insight': None
        }
    
    df = pd.DataFrame(data)
    
    # Step B: Clustering with K-Means
    # CRITICAL: Scale features so duration doesn't dominate score
    features = df[['duration', 'score']].values
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)
    
    # Determine optimal number of clusters (max 3, min 2)
    n_clusters = min(3, len(df) // 3)  # At least 3 points per cluster
    n_clusters = max(2, n_clusters)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df['cluster_id'] = kmeans.fit_predict(features_scaled)
    
    # Step C: Centroid Analysis (Translate to Human Labels)
    # Calculate data-relative thresholds (medians)
    duration_median = df['duration'].median()
    score_median = df['score'].median()
    
    # Get unscaled centroids for interpretation
    cluster_stats = df.groupby('cluster_id').agg({
        'duration': 'mean',
        'score': 'mean',
        'id': 'count'
    }).reset_index()
    cluster_stats.columns = ['cluster_id', 'avg_duration', 'avg_score', 'count']
    
    # Assign Work Mode labels to each cluster using data-relative thresholds
    cluster_labels = {}
    for _, row in cluster_stats.iterrows():
        mode_key = classify_cluster(
            row['avg_duration'], row['avg_score'],
            duration_median, score_median
        )
        cluster_labels[int(row['cluster_id'])] = {
            'mode_key': mode_key,
            **WORK_MODES[mode_key],
            'avg_duration': round(row['avg_duration'], 1),
            'avg_score': round(row['avg_score'], 1),
            'count': int(row['count']),
            'percentage': round(row['count'] / len(df) * 100, 1)
        }
    
    # Map cluster IDs to labels in dataframe
    df['cluster_name'] = df['cluster_id'].map(lambda x: cluster_labels[x]['name'])
    df['cluster_color'] = df['cluster_id'].map(lambda x: cluster_labels[x]['color'])
    
    # Step D: Insight Generation (The "So What?")
    # Find the dominant mode
    dominant_cluster_id = cluster_stats.loc[cluster_stats['count'].idxmax(), 'cluster_id']
    dominant_mode = cluster_labels[int(dominant_cluster_id)]
    
    # Generate contextual insight message - clearer and more actionable
    insight_messages = {
        'deep_focus': f"✅ {dominant_mode['percentage']:.0f}% of your work sessions are long AND productive. This is ideal! Try to schedule your hardest tasks during these peak times.",
        'quick_wins': f"⚡ {dominant_mode['percentage']:.0f}% of your work is short, focused bursts. Great for momentum! For bigger projects, try extending session length with a timer.",
        'burnout_zone': f"⚠️ {dominant_mode['percentage']:.0f}% of your time is spent in long sessions with low output. Action: Try the 25/5 Pomodoro rule—work 25 min, break 5 min.",
        'distracted': f"🔴 {dominant_mode['percentage']:.0f}% of your work sessions are short with low impact. Action: Block distracting websites and silence phone during focus time."
    }
    
    # Prepare chart data for frontend
    chart_data = df[['duration', 'score', 'cluster_name', 'cluster_color', 'activity', 'category']].to_dict('records')
    
    # Prepare cluster summary for legend/stats
    clusters_summary = list(cluster_labels.values())
    clusters_summary.sort(key=lambda x: x['count'], reverse=True)
    
    return {
        'has_data': True,
        'chart_data': chart_data,
        'clusters': clusters_summary,
        'insight': {
            'dominant_mode': dominant_mode['name'],
            'dominant_key': dominant_mode['mode_key'],
            'percentage': dominant_mode['percentage'],
            'message': insight_messages[dominant_mode['mode_key']],
            'action': dominant_mode['action']
        },
        'total_activities': len(df)
    }


def get_work_mode_summary(activities: List[Any]) -> Dict[str, Any]:
    """
    Get a simplified summary for dashboard display.
    """
    result = analyze_work_modes(activities)
    
    if not result['has_data']:
        return result
    
    # Return just the insight for dashboard cards
    return {
        'has_data': True,
        'dominant_mode': result['insight']['dominant_mode'],
        'message': result['insight']['message'],
        'action': result['insight']['action']
    }
