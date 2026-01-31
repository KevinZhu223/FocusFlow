"""
FocusFlow - Standard error responses and decorators.
JSON format: {"error": "Code", "message": "Human readable", "details": {...}}
"""

from functools import wraps
from flask import jsonify, request

from marshmallow import ValidationError as MarshmallowValidationError


# Standard error response shape
def api_error_response(code: str, message: str, details: dict = None, status_code: int = 400):
    """Build standard JSON error response."""
    body = {"error": code, "message": message}
    if details is not None:
        body["details"] = details
    return jsonify(body), status_code


class APIError(Exception):
    """Raise for API errors; use with handle_api_error decorator."""
    def __init__(self, message: str, code: str = "API_ERROR", status_code: int = 400, details: dict = None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


def handle_validation_error(f):
    """Decorator: catch Marshmallow ValidationError and return standard JSON."""
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except MarshmallowValidationError as e:
            return api_error_response(
                "VALIDATION_ERROR",
                "Validation failed",
                details=e.messages if hasattr(e, "messages") else {"_": [str(e)]},
                status_code=422
            )
        except APIError as e:
            return api_error_response(e.code, e.message, e.details, e.status_code)
    return wrapped


def handle_api_error(f):
    """Decorator: catch APIError and return standard JSON."""
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except APIError as e:
            return api_error_response(e.code, e.message, e.details, e.status_code)
    return wrapped
