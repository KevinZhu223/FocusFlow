import json
import pytest

def test_register_user(client):
    """Test user registration"""
    response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "name": "Test User",
        "password": "password123"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert "token" in data
    assert data["user"]["email"] == "test@example.com"

def test_login_user(client):
    """Test user login"""
    # First register
    client.post('/api/auth/register', json={
        "email": "login@example.com",
        "name": "Login User",
        "password": "password123"
    })
    
    # Then login
    response = client.post('/api/auth/login', json={
        "email": "login@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert "token" in data

def test_login_invalid_credentials(client):
    """Test login with wrong password"""
    # Register
    client.post('/api/auth/register', json={
        "email": "wrong@example.com",
        "name": "Wrong User",
        "password": "password123"
    })
    
    # Wrong password
    response = client.post('/api/auth/login', json={
        "email": "wrong@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
