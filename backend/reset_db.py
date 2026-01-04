#!/usr/bin/env python3
"""
FocusFlow - Database Reset Script
WARNING: This will DELETE all existing data!

Run this script when you need to:
- Reset the database after schema changes
- Clear all data and start fresh
- Initialize a new database

Usage:
    python reset_db.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment from parent directory or current
load_dotenv()
load_dotenv('../.env')

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import reset_db

# Database configuration
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/focusflow'
)


def main():
    print("=" * 60)
    print("FocusFlow Database Reset Script")
    print("=" * 60)
    print()
    print(f"Database: {DATABASE_URL}")
    print()
    print("WARNING: This will DELETE ALL existing data!")
    print("This includes:")
    print("  - All users")
    print("  - All activity logs")
    print("  - All associated records")
    print()
    
    confirm = input("Type 'RESET' to confirm database reset: ").strip()
    
    if confirm != 'RESET':
        print("\nAborted. No changes made.")
        return
    
    print("\nResetting database...")
    try:
        reset_db(DATABASE_URL)
        print("\n✓ Database reset complete!")
        print("\nNext steps:")
        print("  1. Start the backend: python app.py")
        print("  2. Register a new account via the frontend or API")
        print("  3. Set OPENAI_API_KEY in .env for LLM features")
    except Exception as e:
        print(f"\n✗ Error resetting database: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
