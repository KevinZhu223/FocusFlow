import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
from app import app as flask_app

# Re-init blueprint helpers
from auth import init_auth_routes
from routes.activities import init_activities_routes
from routes.goals import init_goals_routes
# ... import other init functions as needed, start with core ones

# Use an in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def test_engine():
    """Create a test engine that connects to in-memory SQLite."""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    return engine

@pytest.fixture(scope="session")
def test_session_factory(test_engine):
    """Create a session factory for the test engine."""
    return sessionmaker(bind=test_engine)

@pytest.fixture(scope="session")
def app(test_engine, test_session_factory):
    """Create and configure a new app instance for each test session."""
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = TEST_DATABASE_URL
    
    # Create tables in the test database
    Base.metadata.create_all(test_engine)
    
    # CRITICAL: Re-initialize blueprints with the TEST Session factory
    # This replaces the real Postgres Session with our SQLite Test Session
    init_auth_routes(test_session_factory)
    init_activities_routes(test_session_factory)
    init_goals_routes(test_session_factory)
    # Add others if we test them
    
    yield flask_app
    
    # Teardown
    Base.metadata.drop_all(test_engine)

@pytest.fixture(scope="function")
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture(scope="function")
def session(test_session_factory):
    """
    Creates a new database session for a test.
    Rolls back transaction after test.
    """
    session = test_session_factory()
    try:
        yield session
    finally:
        session.close()
