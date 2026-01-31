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

CATEGORY DEFINITIONS (use these EXACTLY):
- **Career**: Productive work, learning, professional development, building things, working on projects. Examples: coding, studying, research, meetings, emails, coursework, working on projects, side projects, personal projects.
- **Health**: Physical/mental wellness activities. Examples: gym, running, yoga, meditation, cooking healthy meals, sleeping well.
- **Leisure**: Entertainment, relaxation, PASSIVE consumption, playing games. Examples: video games, Netflix, social media scrolling, YouTube, TikTok, Reddit, browsing internet.
- **Chores**: Necessary household/life tasks. Examples: cleaning, laundry, groceries, dishes, errands, organizing.
- **Social**: REAL interpersonal interaction with other humans. Examples: dinner with friends, calling family, hanging out with people, dates, parties.

CRITICAL RULES FOR CAREER vs LEISURE:

✅ CAREER (productive work/building things):
- "Worked on project" / "Working on project" → CAREER
- "Worked on personal project" / "Side project" → CAREER (this is productive work!)
- "Worked on [anything]" → CAREER (the verb "worked" implies productive effort)
- "Coding" / "Programming" / "Building" → CAREER (unless explicitly "for fun" or "playing around")
- "Studying" / "Learning" / "Research" → CAREER
- "Watching tutorials" / "Educational content" → CAREER

❌ LEISURE (entertainment/passive consumption):
- "Played games" / "Gaming" / "Video games" → LEISURE
- "Coding a game FOR FUN" / "Making a game as a hobby" → LEISURE (explicit hobby marker)
- "Netflix" / "Movies" / "TV shows" → LEISURE
- "Social media" / "Scrolling" / "Browsing Reddit" → LEISURE
- "YouTube" (unless educational) → LEISURE

THE KEY TEST: Does the phrase contain "worked on" or "working on"? 
→ If YES, it's almost always CAREER (productive effort implied)
→ If it says "played" or "playing", it's LEISURE

⚠️ OTHER EDGE CASES:
- "Social media" = LEISURE (NOT Social - it's passive entertainment)
- "Talking to/with friends/family" = SOCIAL (real human interaction)
- "Board games with friends" = SOCIAL (in-person social activity)
- "Meal prep/cooking healthy" with health intent = HEALTH
- "Cooking dinner" as routine = CHORES

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

Given the list of activities (and optionally their active goals and recent focus session stats), generate a 2-sentence "Coach's Insight" that:
1. First sentence: Highlight a positive achievement or pattern. If they have goals, reference progress toward those goals when relevant (e.g. "You're doing great on your Coding goal!").
2. Second sentence: Provide one actionable suggestion for improvement.

Be specific, encouraging, and practical. Reference actual activities from their log. Use their goals and focus stats to personalize—avoid generic advice when you have context.
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
    
    # FIRST: Check for explicit work patterns - these ALWAYS take priority
    # The phrase "worked on" or "working on" strongly implies productive effort
    work_patterns = ['worked on', 'working on', 'spent time on', 'finished', 
                     'completed', 'built', 'building', 'developed', 'developing']
    is_work_phrase = any(wp in text_lower for wp in work_patterns)
    
    # Check for explicit "for fun" or hobby markers that override work detection
    fun_markers = ['for fun', 'as a hobby', 'just for fun', 'playing around', 
                   'messing around', 'fooling around']
    is_for_fun = any(fm in text_lower for fm in fun_markers)
    
    # If it has work pattern and no fun marker, it's Career
    if is_work_phrase and not is_for_fun:
        category = CategoryEnum.CAREER
    
    # Leisure indicators - check these only if not already classified as work
    # CRITICAL: "social media" is LEISURE, not Social!
    elif any(kw in text_lower for kw in [
        'game', 'gaming', 'played', 'playing', 'netflix', 'tv', 'youtube', 'movie', 'movies',
        'relax', 'chill', 'scroll', 'scrolling', 'browse', 'browsing',
        'social media', 'instagram', 'tiktok', 'twitter', 'reddit', 'facebook',
        'snapchat', 'discord', 'twitch', 'streamer', 'anime', 'manga',
        'binge', 'show', 'series', 'podcast', 'spotify',
        'phone', 'internet', 'surf', 'surfing', 'leisure',
        'entertainment', 'downtime', 'procrastinat'
    ]) and not is_work_phrase:
        category = CategoryEnum.LEISURE
    
    # Career indicators
    elif any(kw in text_lower for kw in ['work', 'study', 'studying', 'code', 'coding', 
                                          'project', 'meeting', 'email', 'learn', 'learning',
                                          'read', 'reading', 'research', 'class', 'course',
                                          'homework', 'assignment', 'practice', 'training',
                                          'interview', 'job', 'professional', 'side project',
                                          'personal project']):
        category = CategoryEnum.CAREER
    
    # Health indicators
    elif any(kw in text_lower for kw in ['gym', 'exercise', 'workout', 'run', 'running',
                                          'yoga', 'meditat', 'walk', 'walking', 'sleep',
                                          'nap', 'stretch', 'lift', 'swim', 'bike', 
                                          'hike', 'sport', 'healthy', 'health']):
        category = CategoryEnum.HEALTH
    
    # Social indicators - requires REAL human interaction
    # Look for keywords indicating actual people, not platforms
    elif any(kw in text_lower for kw in ['with friend', 'with family', 'with mom', 'with dad',
                                          'with brother', 'with sister', 'with partner',
                                          'hangout', 'hanging out', 'party', 'date',
                                          'dinner with', 'lunch with', 'coffee with',
                                          'called', 'call with', 'talking to', 'talked to',
                                          'visited', 'visiting', 'met with', 'meeting with']):
        category = CategoryEnum.SOCIAL
    
    # Chores indicators
    elif any(kw in text_lower for kw in ['clean', 'cleaning', 'laundry', 'dishes', 'grocery',
                                          'groceries', 'errand', 'organize', 'vacuum',
                                          'cook', 'cooking', 'chore', 'task', 'housework']):
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


def generate_daily_insights(activities: list, context: dict = None) -> str:
    """
    Generate AI-powered daily insights based on the user's activities.
    Optionally inject context (active goals, recent focus session stats) for personalized advice.
    
    Args:
        activities: List of activity dictionaries for the day
        context: Optional dict with active_goals, focus_sessions_last_7_days, focus_minutes_last_7_days
        
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
    
    user_content = f"Today's activities:\n{activities_text}"
    if context:
        goals_text = ""
        if context.get("active_goals"):
            goals_text = "Active goals: " + "; ".join(
                f"{g.get('title', 'Goal')} ({g.get('target_value')}h/{g.get('timeframe', 'week')})"
                for g in context["active_goals"]
            ) + ".\n"
        focus_text = ""
        if context.get("focus_sessions_last_7_days") is not None:
            focus_text = f"Recent focus: {context['focus_sessions_last_7_days']} focus sessions in last 7 days ({context.get('focus_minutes_last_7_days', 0)} min total).\n"
        if goals_text or focus_text:
            user_content = "User context (use to personalize):\n" + goals_text + focus_text + "\n" + user_content
    
    if openai_client:
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": DAILY_INSIGHTS_PROMPT},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.7,
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Failed to generate insights: {e}")
    
    # Fallback insights (optionally mention goals)
    total_score = sum(a.get('productivity_score', 0) for a in activities)
    career_count = sum(1 for a in activities if a.get('category') == 'Career')
    if context and context.get("active_goals"):
        goal_summary = " You're tracking goals—keep it up!"
    else:
        goal_summary = ""
    
    if total_score > 20:
        return f"Great productivity day with {len(activities)} activities logged!{goal_summary} Keep up the momentum by maintaining consistent work sessions tomorrow."
    elif career_count > 0:
        return f"You logged {career_count} career-focused activities today.{goal_summary} Consider balancing with some health or social time for sustainable productivity."
    else:
        return f"You logged {len(activities)} activities today. Try adding more focused work sessions to boost your productivity score."


# Test function
if __name__ == "__main__":
    test_inputs = [
        # CRITICAL: "worked on" should be CAREER even with "personal"
        ("Worked on personal project for 30 mins", "Career"),
        ("Working on side project", "Career"),
        ("Spent time on personal project", "Career"),
        ("Finished my side project", "Career"),
        ("Building a personal app", "Career"),
        
        # But "for fun" should still be LEISURE
        ("Coding a game for fun", "Leisure"),
        ("Working on hobby project just for fun", "Leisure"),
        
        # Social media stays LEISURE
        ("Social media for 1 hr", "Leisure"),
        ("Scrolling Instagram", "Leisure"),
        ("Browsing Reddit for 30 min", "Leisure"),
        
        # Standard cases
        ("Studied Python for 2 hours", "Career"),
        ("Played video games all evening", "Leisure"),
        ("Watched Netflix", "Leisure"),
        ("Went to the gym for 45 minutes", "Health"),
        
        # REAL Social interactions
        ("Dinner with friends", "Social"),
        ("Called mom for 30 min", "Social"),
    ]
    
    print("NLP Parser Test Results (Edge Case Testing):")
    print("=" * 70)
    
    passed = 0
    failed = 0
    
    for item in test_inputs:
        if isinstance(item, tuple):
            text, expected = item
        else:
            text, expected = item, None
            
        result = parse_activity(text)
        actual = result['category'].value
        
        if expected:
            status = "✓ PASS" if actual == expected else f"✗ FAIL (expected {expected})"
            if actual == expected:
                passed += 1
            else:
                failed += 1
        else:
            status = ""
        
        print(f"\nInput: '{text}'")
        print(f"  Category: {actual} {status}")
        print(f"  Duration: {result['duration_minutes']} min")
        print(f"  Score: {result['productivity_score']}")
    
    print("\n" + "=" * 70)
    print(f"Results: {passed} passed, {failed} failed")
