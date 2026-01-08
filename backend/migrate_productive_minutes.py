"""
Migration script to add productive_minutes column to users table
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/focusflow'
)

def migrate():
    """Add productive_minutes column to users table"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Add the new column
        conn.execute(text('''
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS productive_minutes INTEGER DEFAULT 0
        '''))
        conn.commit()
        print("✅ Migration complete: Added productive_minutes column to users table")

if __name__ == "__main__":
    migrate()
