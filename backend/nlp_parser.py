"""
FocusFlow - NLP Parser Module (Phase 2: OpenAI Integration)
Uses GPT-4o-mini for intelligent activity parsing with context awareness.
"""

import os
import json
import re
from typing import Dict, Any, Optional
from models import CategoryEnum

# OpenAI client - will be initialized if API key is available
openai_client = None

try:
    from openai import OpenAI
    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        openai_client = OpenAI(api_key=api_key)
except ImportError:
    pass

# Base productivity scores by category
BASE_SCORES = {
    CategoryEnum.CAREER: 10,
    CategoryEnum.HEALTH: 8,
    CategoryEnum.SOCIAL: 5,
    CategoryEnum.CHORES: 4,
    CategoryEnum.LEISURE: -5
}

# Focus/Flow state multiplier
FOCUS_MULTIPLIER = 1.2

# System prompt for activity parsing
ACTIVITY_PARSER_PROMPT = """You are a data extraction engine for a productivity tracking app. Analyze the user's natural language text describing an activity they did.

IMPORTANT CONTEXT RULES:
- "Coding a game" or "playing games" = Leisure (entertainment/hobby)
- "Coding a project" or "working on code" = Career (productive work)
- "Watching educational content" = Career (learning)
- "Watching Netflix/TV" = Leisure (entertainment)
- "Meal prep" or "cooking healthy" = Health
- "Cooking dinner" = Chores

Return STRICT JSON with these fields:
{
  "activity_name": "A clean, concise name for the activity (2-4 words)",
  "category": "Career|Health|Leisure|Chores|Social",
  "duration_minutes": number or null if not specified,
  "sentiment_score": number from -1.0 to 1.0 (negative=frustrated, positive=happy),
  "is_focus_session": boolean (true if text implies deep work, flow state, focused, concentrated)
}

Only return the JSON object, no other text."""

# Daily insights system prompt
DAILY_INSIGHTS_PROMPT = """You are a supportive yet honest productivity coach analyzing a user's daily activity log.

Given the list of activities, generate a 2-sentence "Coach's Insight" that:
1. First sentence: Highlight a positive achievement or pattern
2. Second sentence: Provide one actionable suggestion for improvement

Be specific, encouraging, and practical. Reference actual activities from their log.
Keep it concise - exactly 2 sentences."""


def calculate_weighted_score(
    category: CategoryEnum,
    duration_minutes: Optional[int],
    is_focus_session: bool
) -> float:
    """
    Calculate weighted productivity score using the formula:
    Score = BaseCategoryScore * DurationHours * Multiplier
    
    Args:
        category: The activity category
        duration_minutes: Duration of the activity in minutes
        is_focus_session: Whether the activity was a focused session
    
    Returns:
        Weighted productivity score
    """
    base_score = BASE_SCORES.get(category, 0)
    
    # Convert duration to hours (default to 0.5 hours if not specified)
    duration_hours = (duration_minutes or 30) / 60.0
    
    # Cap duration factor to prevent extreme scores
    duration_factor = min(duration_hours, 4.0)  # Cap at 4 hours
    
    # Calculate base weighted score
    score = base_score * duration_factor
    
    # Apply focus multiplier if applicable
    if is_focus_session and category in [CategoryEnum.CAREER, CategoryEnum.HEALTH]:
        score *= FOCUS_MULTIPLIER
    
    return round(score, 2)


def parse_with_llm(text: str) -> Dict[str, Any]:
    """
    Parse activity text using OpenAI GPT-4o-mini.
    
    Args:
        text: Raw user input
        
    Returns:
        Parsed activity data
    """
    if not openai_client:
        raise RuntimeError("OpenAI client not initialized. Set OPENAI_API_KEY env var.")
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": ACTIVITY_PARSER_PROMPT},
                {"role": "user", "content": text}
            ],
            temperature=0.3,  # Low temperature for consistent extraction
            max_tokens=200
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        # Handle potential markdown code blocks
        if result_text.startswith('```'):
            result_text = re.sub(r'^```(?:json)?\n?', '', result_text)
            result_text = re.sub(r'\n?```$', '', result_text)
        
        parsed = json.loads(result_text)
        
        # Map category string to enum
        category_str = parsed.get('category', 'Career')
        category = CategoryEnum[category_str.upper()]
        
        return {
            "activity_name": parsed.get('activity_name', text[:50]),
            "category": category,
            "duration_minutes": parsed.get('duration_minutes'),
            "sentiment_score": parsed.get('sentiment_score', 0.0),
            "is_focus_session": parsed.get('is_focus_session', False)
        }
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse LLM response as JSON: {e}")
    except KeyError as e:
        raise ValueError(f"Invalid category in LLM response: {e}")


def parse_with_fallback(text: str) -> Dict[str, Any]:
    """
    Fallback parser using regex patterns when LLM is unavailable.
    This is a simplified version for when OpenAI API is not configured.
    """
    text_lower = text.lower()
    
    # Duration extraction patterns
    duration_patterns = [
        (r'(\d+)\s*hours?', lambda m: int(m.group(1)) * 60),
        (r'(\d+)\s*hrs?', lambda m: int(m.group(1)) * 60),
        (r'(\d+)\s*minutes?', lambda m: int(m.group(1))),
        (r'(\d+)\s*mins?', lambda m: int(m.group(1))),
        (r'(\d+(?:\.\d+)?)\s*h\b', lambda m: int(float(m.group(1)) * 60)),
    ]
    
    duration_minutes = None
    for pattern, extractor in duration_patterns:
        match = re.search(pattern, text_lower)
        if match:
            duration_minutes = extractor(match)
            break
    
    # Category detection with context awareness
    category = CategoryEnum.CAREER  # Default
    
    # Leisure indicators (check first as they're more specific)
    leisure_keywords = ['game', 'gaming', 'netflix', 'tv', 'youtube', 'movie', 
                       'relax', 'chill', 'scroll', 'social media', 'tiktok']
    if any(kw in text_lower for kw in leisure_keywords):
        # Context check for "coding a game" - still leisure
        if 'coding' in text_lower and 'game' in text_lower:
            category = CategoryEnum.LEISURE
        else:
            category = CategoryEnum.LEISURE
    
    # Career indicators
    elif any(kw in text_lower for kw in ['work', 'study', 'code', 'project', 'meeting', 
                                          'email', 'learn', 'read', 'research']):
        category = CategoryEnum.CAREER
    
    # Health indicators
    elif any(kw in text_lower for kw in ['gym', 'exercise', 'workout', 'run', 'yoga',
                                          'meditat', 'walk', 'sleep', 'nap']):
        category = CategoryEnum.HEALTH
    
    # Social indicators
    elif any(kw in text_lower for kw in ['friend', 'family', 'dinner', 'lunch', 'call',
                                          'hangout', 'party', 'date']):
        category = CategoryEnum.SOCIAL
    
    # Chores indicators
    elif any(kw in text_lower for kw in ['clean', 'laundry', 'dishes', 'grocery',
                                          'errand', 'organize', 'vacuum']):
        category = CategoryEnum.CHORES
    
    # Focus detection
    focus_keywords = ['focus', 'focused', 'deep work', 'flow', 'concentrated', 
                      'productive', 'zone', 'uninterrupted']
    is_focus = any(kw in text_lower for kw in focus_keywords)
    
    # Generate activity name
    words = text.strip().split()[:5]
    activity_name = ' '.join(words).title()
    
    return {
        "activity_name": activity_name,
        "category": category,
        "duration_minutes": duration_minutes,
        "sentiment_score": 0.0,
        "is_focus_session": is_focus
    }


def parse_activity(text: str) -> Dict[str, Any]:
    """
    Parse raw activity text into structured data.
    Uses OpenAI API if available, falls back to regex-based parsing.
    
    Args:
        text: Raw user input describing their activity
        
    Returns:
        Dictionary with parsed activity data including weighted productivity score
    """
    # Try LLM parsing first
    if openai_client:
        try:
            parsed = parse_with_llm(text)
        except Exception as e:
            print(f"LLM parsing failed, using fallback: {e}")
            parsed = parse_with_fallback(text)
    else:
        parsed = parse_with_fallback(text)
    
    # Calculate weighted productivity score
    productivity_score = calculate_weighted_score(
        category=parsed['category'],
        duration_minutes=parsed['duration_minutes'],
        is_focus_session=parsed['is_focus_session']
    )
    
    parsed['productivity_score'] = productivity_score
    
    return parsed


def generate_daily_insights(activities: list) -> str:
    """
    Generate AI-powered daily insights based on the user's activities.
    
    Args:
        activities: List of activity dictionaries for the day
        
    Returns:
        2-sentence coach insight string
    """
    if not activities:
        return "No activities logged today. Start tracking to get personalized insights!"
    
    # Format activities for the prompt
    activities_text = "\n".join([
        f"- {a.get('activity_name', 'Activity')} ({a.get('category', 'Unknown')}, "
        f"{a.get('duration_minutes', 'unknown')} min, score: {a.get('productivity_score', 0)})"
        for a in activities
    ])
    
    if openai_client:
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": DAILY_INSIGHTS_PROMPT},
                    {"role": "user", "content": f"Today's activities:\n{activities_text}"}
                ],
                temperature=0.7,
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Failed to generate insights: {e}")
    
    # Fallback insights
    total_score = sum(a.get('productivity_score', 0) for a in activities)
    career_count = sum(1 for a in activities if a.get('category') == 'Career')
    
    if total_score > 20:
        return f"Great productivity day with {len(activities)} activities logged! Keep up the momentum by maintaining consistent work sessions tomorrow."
    elif career_count > 0:
        return f"You logged {career_count} career-focused activities today. Consider balancing with some health or social time for sustainable productivity."
    else:
        return f"You logged {len(activities)} activities today. Try adding more focused work sessions to boost your productivity score."


# Test function
if __name__ == "__main__":
    test_inputs = [
        "Studied Python for 2 hours",
        "Played video games all evening",
        "Deep work coding session for 3 hours, really focused",
        "Watched Netflix",
        "Went to the gym for 45 minutes",
        "Coding a game for fun",
        "Coding a project for work for 2 hours"
    ]
    
    print("NLP Parser Test Results (Phase 2):")
    print("=" * 60)
    
    for text in test_inputs:
        result = parse_activity(text)
        print(f"\nInput: '{text}'")
        print(f"  Activity: {result['activity_name']}")
        print(f"  Category: {result['category'].value}")
        print(f"  Duration: {result['duration_minutes']} min")
        print(f"  Focus: {result['is_focus_session']}")
        print(f"  Score: {result['productivity_score']}")
