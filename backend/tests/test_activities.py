"""
FocusFlow - Activities API tests.
CRUD and scoring logic (dashboard, log_activity).
"""

import pytest
from datetime import datetime, timedelta

from models import User, ActivityLog, CategoryEnum, SourceEnum


def test_log_activity_creates_entry(test_client, demo_user, test_db_session):
    """POST /api/log_activity creates an activity and returns gamification info."""
    # No auth = demo user
    r = test_client.post("/api/log_activity", json={"text": "Coded for 2 hours"})
    assert r.status_code == 201
    data = r.get_json()
    assert data["success"] is True
    assert "activity" in data
    assert data["activity"]["activity_name"]
    assert data["activity"]["category"] in [c.value for c in CategoryEnum]
    assert data["activity"]["duration_minutes"] is not None or data["activity"]["productivity_score"] is not None
    assert "gamification" in data


def test_log_activity_missing_text(test_client):
    """POST /api/log_activity without 'text' returns 400."""
    r = test_client.post("/api/log_activity", json={})
    assert r.status_code == 400


def test_get_activities(test_client, demo_user, test_db_session):
    """GET /api/activities returns list for the day."""
    r = test_client.get("/api/activities")
    assert r.status_code == 200
    data = r.get_json()
    assert "activities" in data
    assert "date" in data
    assert isinstance(data["activities"], list)


def test_delete_activity(test_client, demo_user, test_db_session):
    """DELETE /api/activities/<id> removes own activity."""
    activity = ActivityLog(
        user_id=demo_user.id,
        raw_input="Test activity",
        activity_name="Test",
        category=CategoryEnum.CAREER,
        duration_minutes=30,
        productivity_score=5.0,
        source=SourceEnum.MANUAL
    )
    test_db_session.add(activity)
    test_db_session.commit()
    test_db_session.refresh(activity)
    aid = activity.id

    r = test_client.delete(f"/api/activities/{aid}")
    assert r.status_code == 200
    assert test_db_session.query(ActivityLog).filter_by(id=aid).first() is None


def test_delete_activity_not_found(test_client, demo_user):
    """DELETE /api/activities/99999 returns 404."""
    r = test_client.delete("/api/activities/99999")
    assert r.status_code == 404


def test_dashboard_returns_stats(test_client, demo_user, test_db_session):
    """GET /api/dashboard returns daily score, category breakdown, level, streak."""
    r = test_client.get("/api/dashboard")
    assert r.status_code == 200
    data = r.get_json()
    assert "date" in data
    assert "daily_score" in data
    assert "activity_count" in data
    assert "category_breakdown" in data
    assert "level" in data
    assert "xp" in data
    assert "streak" in data


def test_scoring_career_positive(test_client, demo_user):
    """Logging career activity yields positive productivity score."""
    r = test_client.post("/api/log_activity", json={"text": "Studied for 1 hour"})
    assert r.status_code == 201
    data = r.get_json()
    assert data["activity"]["productivity_score"] > 0
    assert data["activity"]["category"] == CategoryEnum.CAREER.value


def test_scoring_leisure_negative(test_client, demo_user):
    """Logging leisure activity yields negative productivity score."""
    r = test_client.post("/api/log_activity", json={"text": "Played games for 1 hour"})
    assert r.status_code == 201
    data = r.get_json()
    assert data["activity"]["productivity_score"] < 0
    assert data["activity"]["category"] == CategoryEnum.LEISURE.value
