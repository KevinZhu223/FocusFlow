"""
FocusFlow - Deep Data Analytics Module
Phase 5: Real correlations, heatmaps, and data export using Pandas

This module provides advanced analytics to help users understand
patterns in their productivity data.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from io import StringIO
import json


# Data confidence thresholds
CONFIDENCE_THRESHOLDS = {
    'low': 10,      # < 10 activities
    'medium': 50,   # 10-50 activities
    'high': 50      # > 50 activities
}


def calculate_data_confidence(activity_count: int) -> Dict[str, Any]:
    """
    Calculate data confidence level based on activity count.
    
    Returns:
        dict with 'level' (low/medium/high), 'message', and 'show_warning'
    """
    if activity_count < CONFIDENCE_THRESHOLDS['low']:
        return {
            'level': 'low',
            'activity_count': activity_count,
            'needed': CONFIDENCE_THRESHOLDS['low'] - activity_count,
            'message': f"Keep logging! Need {CONFIDENCE_THRESHOLDS['low'] - activity_count} more activities for insights.",
            'show_warning': True
        }
    elif activity_count < CONFIDENCE_THRESHOLDS['medium']:
        return {
            'level': 'medium',
            'activity_count': activity_count,
            'needed': 0,
            'message': "Early patterns emerging. Accuracy improves with more data.",
            'show_warning': True
        }
    else:
        return {
            'level': 'high',
            'activity_count': activity_count,
            'needed': 0,
            'message': "Strong data foundation for reliable insights.",
            'show_warning': False
        }


def activities_to_dataframe(activities: List[Any], tz_offset: int = 0) -> pd.DataFrame:
    """
    Convert activity objects to a Pandas DataFrame for analysis.
    
    Args:
        activities: List of ActivityLog objects
        tz_offset: Timezone offset in minutes (positive = behind UTC, e.g., 300 for EST)
    """
    if not activities:
        return pd.DataFrame()
    
    data = []
    for act in activities:
        # Extract category value from enum
        category_value = act.category.value if hasattr(act.category, 'value') else str(act.category)
        
        # Convert UTC timestamp to local time for consistent date grouping
        local_timestamp = act.timestamp - timedelta(minutes=tz_offset)
        
        data.append({
            'id': act.id,
            'timestamp': local_timestamp,  # Use local time
            'category': category_value,
            'duration': act.duration_minutes or 0,
            'impact': act.productivity_score or 0,  # Use productivity_score
            'hour': local_timestamp.hour,
            'day_of_week': local_timestamp.weekday(),  # 0=Monday
            'date': local_timestamp.date(),
            'description': act.activity_name or act.raw_input,  # Use activity_name
            'sentiment': act.sentiment_score or 0
        })
    
    df = pd.DataFrame(data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    return df


def get_productivity_insights(activities: List[Any]) -> Dict[str, Any]:
    """
    Generate actionable productivity insights from user data.
    
    Instead of abstract correlations, this provides:
    - Most productive day of the week
    - Morning vs afternoon comparison
    - Category breakdown with time investment
    - Personal records (longest session, most active day)
    """
    df = activities_to_dataframe(activities)
    
    if df.empty or len(df) < 3:
        return {
            'insights': [],
            'confidence': calculate_data_confidence(len(df)),
            'has_data': False
        }
    
    insights = []
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    # 1. Most Productive Day
    daily_stats = df.groupby('day_of_week').agg({
        'impact': 'sum',
        'id': 'count'
    }).reset_index()
    
    if not daily_stats.empty:
        best_day_idx = daily_stats.loc[daily_stats['impact'].idxmax(), 'day_of_week']
        best_day_name = day_names[int(best_day_idx)]
        total_on_best = daily_stats.loc[daily_stats['day_of_week'] == best_day_idx, 'id'].values[0]
        
        insights.append({
            'type': 'best_day',
            'icon': 'Calendar',
            'title': f'{best_day_name}s are your power day',
            'subtitle': f'{int(total_on_best)} activities logged on {best_day_name}s',
            'color': 'indigo'
        })
    
    # 2. Morning vs Afternoon
    df['time_period'] = df['hour'].apply(lambda h: 'morning' if h < 12 else ('afternoon' if h < 17 else 'evening'))
    period_stats = df.groupby('time_period').agg({
        'id': 'count',
        'impact': 'sum'
    }).reset_index()
    
    if len(period_stats) >= 2:
        morning = period_stats[period_stats['time_period'] == 'morning']['id'].sum()
        afternoon = period_stats[period_stats['time_period'] == 'afternoon']['id'].sum()
        evening = period_stats[period_stats['time_period'] == 'evening']['id'].sum()
        
        if morning > afternoon and morning > evening:
            pct = round((morning / (morning + afternoon + evening)) * 100)
            insights.append({
                'type': 'time_preference',
                'icon': 'Sunrise',
                'title': 'You\'re a morning person',
                'subtitle': f'{pct}% of your activities happen before noon',
                'color': 'amber'
            })
        elif afternoon > morning and afternoon > evening:
            pct = round((afternoon / (morning + afternoon + evening)) * 100)
            insights.append({
                'type': 'time_preference',
                'icon': 'Sun',
                'title': 'Afternoon is your prime time',
                'subtitle': f'{pct}% of your activities happen in the afternoon',
                'color': 'orange'
            })
        elif evening > morning and evening > afternoon:
            pct = round((evening / (morning + afternoon + evening)) * 100)
            insights.append({
                'type': 'time_preference',
                'icon': 'Moon',
                'title': 'You\'re a night owl',
                'subtitle': f'{pct}% of your activities happen in the evening',
                'color': 'violet'
            })
    
    # 3. Top Category This Week
    this_week = df[df['date'] >= (datetime.now().date() - timedelta(days=7))]
    if not this_week.empty:
        cat_stats = this_week.groupby('category').agg({
            'duration': 'sum',
            'id': 'count'
        }).reset_index()
        
        if not cat_stats.empty:
            top_cat = cat_stats.loc[cat_stats['duration'].idxmax()]
            hours = round(top_cat['duration'] / 60, 1)
            
            insights.append({
                'type': 'top_category',
                'icon': 'Trophy',
                'title': f'{top_cat["category"]} is dominating this week',
                'subtitle': f'{hours}h logged across {int(top_cat["id"])} activities',
                'color': 'emerald'
            })
    
    # 4. Personal Record - Most Active Day
    if len(df) >= 5:
        daily_counts = df.groupby('date').agg({'id': 'count'}).reset_index()
        record_day = daily_counts.loc[daily_counts['id'].idxmax()]
        
        insights.append({
            'type': 'record',
            'icon': 'Award',
            'title': f'Personal record: {int(record_day["id"])} activities in one day',
            'subtitle': f'Achieved on {record_day["date"].strftime("%B %d, %Y")}',
            'color': 'pink'
        })

    # --- ADVANCED DATA SCIENCE METRICS ---

    # 5. Deep Work Probability (Conditional Probability)
    # P(High Focus | Time Period)
    if len(df) >= 10:
        high_focus_threshold = df['impact'].quantile(0.75)  # Top 25% impact
        df['is_high_focus'] = df['impact'] > high_focus_threshold
        
        # Calculate probability by hour block
        hourly_probs = df.groupby('hour')['is_high_focus'].mean().reset_index()
        best_hour_row = hourly_probs.loc[hourly_probs['is_high_focus'].idxmax()]
        best_hour = int(best_hour_row['hour'])
        prob_pct = int(best_hour_row['is_high_focus'] * 100)
        
        if prob_pct > 30:
            time_str = f"{best_hour % 12 or 12} {'AM' if best_hour < 12 else 'PM'}"
            insights.append({
                'type': 'probability',
                'icon': 'Brain',
                'title': f'{prob_pct}% High-Focus Probability at {time_str}',
                'subtitle': 'Historical data suggests this is your peak flow state time',
                'color': 'violet'
            })

    # 6. Efficiency Score (Impact per Hour)
    if df['duration'].sum() > 0:
        avg_impact_per_hour = (df['impact'].sum() / df['duration'].sum()) * 60
        insights.append({
            'type': 'efficiency',
            'icon': 'Zap',
            'title': f'Efficiency Score: {round(avg_impact_per_hour, 1)} pts/hr',
            'subtitle': 'Average productivity impact generated per hour of work',
            'color': 'amber'
        })

    # 7. Focus Velocity (Trend of Efficiency)
    # Compare last 5 days vs previous 5 days efficiency
    recent_cutoff = datetime.now().date() - timedelta(days=5)
    recent_df = df[df['date'] >= recent_cutoff]
    prev_cutoff = recent_cutoff - timedelta(days=5)
    prev_df = df[(df['date'] < recent_cutoff) & (df['date'] >= prev_cutoff)]

    if not recent_df.empty and not prev_df.empty and recent_df['duration'].sum() > 0 and prev_df['duration'].sum() > 0:
        recent_eff = (recent_df['impact'].sum() / recent_df['duration'].sum()) * 60
        prev_eff = (prev_df['impact'].sum() / prev_df['duration'].sum()) * 60
        
        delta = recent_eff - prev_eff
        pct_change = int((delta / prev_eff) * 100) if prev_eff > 0 else 0
        
        if abs(pct_change) > 5:
            direction = "accelerating" if pct_change > 0 else "decelerating"
            color = "emerald" if pct_change > 0 else "orange"
            icon = "TrendingUp" if pct_change > 0 else "TrendingDown"
            
            insights.append({
                'type': 'velocity',
                'icon': icon,
                'title': f'Productivity Velocity is {direction} ({pct_change:+d}%)',
                'subtitle': f'Compared to previous 5 days efficiency ({round(recent_eff, 1)} vs {round(prev_eff, 1)})',
                'color': color
            })
    
    return {
        'insights': insights[:4],  # Return top 4 most relevant insights
        'confidence': calculate_data_confidence(len(df)),
        'has_data': True
    }


def get_productivity_heatmap(activities: List[Any]) -> Dict[str, Any]:
    """
    Generate a 7-day x 24-hour heatmap of productivity.
    
    Returns grid data for visualization showing when user is most productive.
    """
    df = activities_to_dataframe(activities)
    
    if df.empty:
        return {
            'heatmap': [],
            'peak_time': None,
            'confidence': calculate_data_confidence(0),
            'has_data': False
        }
    
    # Aggregate by day of week and hour
    heatmap_data = df.groupby(['day_of_week', 'hour']).agg({
        'impact': 'mean',
        'duration': 'sum',
        'id': 'count'
    }).reset_index()
    
    heatmap_data.columns = ['day', 'hour', 'avg_impact', 'total_duration', 'activity_count']
    
    # Normalize impact for color intensity (0-1)
    if heatmap_data['avg_impact'].max() > heatmap_data['avg_impact'].min():
        heatmap_data['intensity'] = (
            (heatmap_data['avg_impact'] - heatmap_data['avg_impact'].min()) / 
            (heatmap_data['avg_impact'].max() - heatmap_data['avg_impact'].min())
        )
    else:
        heatmap_data['intensity'] = 0.5
    
    # Convert to list of dicts for JSON
    heatmap = heatmap_data.to_dict('records')
    
    # Find peak productivity time
    peak_row = heatmap_data.loc[heatmap_data['avg_impact'].idxmax()]
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    peak_time = {
        'day': day_names[int(peak_row['day'])],
        'day_index': int(peak_row['day']),
        'hour': int(peak_row['hour']),
        'hour_label': f"{int(peak_row['hour']):02d}:00",
        'avg_impact': round(float(peak_row['avg_impact']), 2)
    }
    
    return {
        'heatmap': heatmap,
        'peak_time': peak_time,
        'confidence': calculate_data_confidence(len(df)),
        'has_data': True,
        'total_activities': len(df)
    }


def get_trend_analysis(activities: List[Any], days: int = 30, tz_offset: int = 0) -> Dict[str, Any]:
    """
    Calculate rolling averages and trends over time.
    
    Args:
        activities: List of ActivityLog objects
        days: Number of days to analyze
        tz_offset: Timezone offset in minutes for consistent date grouping with Heatmap
    """
    df = activities_to_dataframe(activities, tz_offset=tz_offset)
    
    if df.empty:
        return {
            'daily_scores': [],
            'rolling_avg': [],
            'trend': 'neutral',
            'confidence': calculate_data_confidence(0),
            'has_data': False
        }
    
    # Filter to last N days
    cutoff = datetime.now() - timedelta(days=days)
    df = df[df['timestamp'] >= cutoff]
    
    if df.empty:
        return {
            'daily_scores': [],
            'rolling_avg': [],
            'trend': 'neutral',
            'confidence': calculate_data_confidence(0),
            'has_data': False
        }
    
    # Daily aggregation
    daily = df.groupby('date').agg({
        'impact': 'sum',
        'duration': 'sum',
        'id': 'count'
    }).reset_index()
    
    daily.columns = ['date', 'score', 'duration', 'activity_count']
    daily = daily.sort_values('date')
    
    # Calculate 7-day rolling average
    daily['rolling_avg'] = daily['score'].rolling(window=7, min_periods=1).mean()
    
    # Determine trend (comparing first half to second half)
    if len(daily) >= 7:
        mid = len(daily) // 2
        first_half_avg = daily['score'].iloc[:mid].mean()
        second_half_avg = daily['score'].iloc[mid:].mean()
        
        if second_half_avg > first_half_avg * 1.1:
            trend = 'improving'
            trend_percent = round((second_half_avg - first_half_avg) / first_half_avg * 100, 1)
        elif second_half_avg < first_half_avg * 0.9:
            trend = 'declining'
            trend_percent = round((second_half_avg - first_half_avg) / first_half_avg * 100, 1)
        else:
            trend = 'stable'
            trend_percent = 0
    else:
        trend = 'insufficient_data'
        trend_percent = 0
    
    # Convert dates to strings for JSON
    daily['date'] = daily['date'].astype(str)
    
    return {
        'daily_scores': daily[['date', 'score', 'duration', 'activity_count']].to_dict('records'),
        'rolling_avg': daily[['date', 'rolling_avg']].to_dict('records'),
        'trend': trend,
        'trend_percent': trend_percent,
        'confidence': calculate_data_confidence(len(df)),
        'has_data': True
    }


def get_category_breakdown(activities: List[Any]) -> Dict[str, Any]:
    """
    Get detailed category statistics for the analytics page.
    """
    df = activities_to_dataframe(activities)
    
    if df.empty:
        return {
            'categories': [],
            'confidence': calculate_data_confidence(0),
            'has_data': False
        }
    
    # Aggregate by category
    category_stats = df.groupby('category').agg({
        'duration': 'sum',
        'impact': ['sum', 'mean'],
        'id': 'count'
    }).reset_index()
    
    category_stats.columns = ['category', 'total_duration', 'total_impact', 'avg_impact', 'count']
    
    # Calculate percentages
    total_duration = category_stats['total_duration'].sum()
    category_stats['percentage'] = round(category_stats['total_duration'] / total_duration * 100, 1)
    
    # Sort by total duration
    category_stats = category_stats.sort_values('total_duration', ascending=False)
    
    return {
        'categories': category_stats.to_dict('records'),
        'total_duration': int(total_duration),
        'total_activities': len(df),
        'confidence': calculate_data_confidence(len(df)),
        'has_data': True
    }


def export_to_csv(activities: List[Any]) -> str:
    """
    Export all activities to CSV format.
    
    Returns CSV string that can be downloaded.
    """
    df = activities_to_dataframe(activities)
    
    if df.empty:
        return "No data to export"
    
    # Select and rename columns for export
    export_df = df[['timestamp', 'category', 'description', 'duration', 'impact', 'sentiment']].copy()
    export_df.columns = ['Timestamp', 'Category', 'Activity', 'Duration (min)', 'Impact Score', 'Sentiment']
    
    # Sort by timestamp descending
    export_df = export_df.sort_values('Timestamp', ascending=False)
    
    # Convert to CSV
    csv_buffer = StringIO()
    export_df.to_csv(csv_buffer, index=False)
    
    return csv_buffer.getvalue()


def get_full_analytics(activities: List[Any], tz_offset: int = 0) -> Dict[str, Any]:
    """
    Get all analytics data in one call (for the analytics page).
    
    Args:
        activities: List of ActivityLog objects
        tz_offset: Timezone offset in minutes for consistent date grouping
    """
    return {
        'insights': get_productivity_insights(activities),
        'heatmap': get_productivity_heatmap(activities),
        'trends': get_trend_analysis(activities, tz_offset=tz_offset),
        'categories': get_category_breakdown(activities),
        'confidence': calculate_data_confidence(len(activities))
    }
