"""
FocusFlow - Authentication Blueprint
JWT-based authentication with register, login, and user endpoints
"""

import os
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify, g
import jwt
import bcrypt

from models import User

# Create blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'focusflow-dev-secret-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days


def generate_token(user_id: int) -> str:
    """Generate a JWT token for a user"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def require_auth(f):
    """Decorator to require authentication for a route"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'Missing authorization header'}), 401
        
        # Extract token (Bearer <token>)
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid authorization header format'}), 401
        
        token = parts[1]
        
        # Decode token
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Store user_id in g for use in the route
        g.user_id = payload['user_id']
        
        return f(*args, **kwargs)
    return decorated_function


def get_current_user(Session):
    """Get the current authenticated user from the database"""
    if not hasattr(g, 'user_id'):
        return None
    
    session = Session()
    try:
        user = session.query(User).filter_by(id=g.user_id).first()
        return user
    finally:
        session.close()


# Routes will be added dynamically when blueprint is registered
def init_auth_routes(Session):
    """Initialize auth routes with database session"""
    
    @auth_bp.route('/register', methods=['POST'])
    def register():
        """Register a new user"""
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        email = data.get('email', '').strip().lower()
        name = data.get('name', '').strip()
        password = data.get('password', '')
        
        # Validation
        if not email or '@' not in email:
            return jsonify({'error': 'Valid email is required'}), 400
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        session = Session()
        try:
            # Check if email already exists
            existing_user = session.query(User).filter_by(email=email).first()
            if existing_user:
                return jsonify({'error': 'Email already registered'}), 409
            
            # Create new user
            user = User(
                email=email,
                name=name,
                password_hash=hash_password(password)
            )
            session.add(user)
            session.commit()
            
            # Generate token
            token = generate_token(user.id)
            
            return jsonify({
                'success': True,
                'token': token,
                'user': user.to_dict()
            }), 201
            
        except Exception as e:
            session.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            session.close()
    
    @auth_bp.route('/login', methods=['POST'])
    def login():
        """Login with email and password"""
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        session = Session()
        try:
            user = session.query(User).filter_by(email=email).first()
            
            if not user:
                return jsonify({'error': 'Invalid email or password'}), 401
            
            # Check password (allow demo user without password)
            if user.password_hash:
                if not verify_password(password, user.password_hash):
                    return jsonify({'error': 'Invalid email or password'}), 401
            else:
                # Demo user - accept any password
                pass
            
            # Generate token
            token = generate_token(user.id)
            
            return jsonify({
                'success': True,
                'token': token,
                'user': user.to_dict()
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            session.close()
    
    @auth_bp.route('/me', methods=['GET'])
    @require_auth
    def get_me():
        """Get current authenticated user"""
        session = Session()
        try:
            user = session.query(User).filter_by(id=g.user_id).first()
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return jsonify({
                'user': user.to_dict()
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            session.close()
    
    return auth_bp


def get_user_from_token(token, Session):
    """
    Helper function to decode a token and return the User object.
    Requires the database Session factory to be passed in.
    """
    try:
        if not token:
            return None
            
        # Clean the token if it has "Bearer " prefix
        if token.startswith('Bearer '):
            token = token.split(' ')[1]
            
        # Use the existing decode_token function in this file
        payload = decode_token(token)
        if not payload:
            return None
        
        # Query the database
        session = Session()
        try:
            user = session.query(User).filter_by(id=payload['user_id']).first()
            return user
        finally:
            session.close()
            
    except Exception as e:
        print(f"Token Error: {e}")
        return None