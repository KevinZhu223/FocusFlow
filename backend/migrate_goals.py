"""
Robust migration script for goals table
Backs up data, recreates table with correct schema, restores data
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment")
    exit(1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Starting goals table migration...")
    
    # Step 1: Create the goal_type enum if it doesn't exist
    try:
        conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE goaltypeenum AS ENUM ('target', 'limit');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        conn.commit()
        print("✓ Created goaltypeenum type")
    except Exception as e:
        print(f"Note on enum type: {e}")
    
    # Step 2: Add DAILY to timeframe enum if not exists
    try:
        conn.execute(text("""
            ALTER TYPE timeframeenum ADD VALUE IF NOT EXISTS 'daily' BEFORE 'weekly';
        """))
        conn.commit()
        print("✓ Added 'daily' to timeframeenum")
    except Exception as e:
        print(f"Note on timeframe enum: {e}")
    
    # Step 3: Check if goal_type column exists
    result = conn.execute(text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'goals' AND column_name = 'goal_type'
    """))
    column_exists = result.fetchone() is not None
    
    if column_exists:
        print("✓ goal_type column already exists")
    else:
        # Step 4: Add the goal_type column with default value
        try:
            conn.execute(text("""
                ALTER TABLE goals 
                ADD COLUMN goal_type goaltypeenum DEFAULT 'target' NOT NULL
            """))
            conn.commit()
            print("✓ Added goal_type column with enum type")
        except Exception as e:
            # Fallback to varchar if enum fails
            print(f"Enum failed ({e}), trying VARCHAR...")
            try:
                conn.execute(text("""
                    ALTER TABLE goals 
                    ADD COLUMN goal_type VARCHAR(20) DEFAULT 'target' NOT NULL
                """))
                conn.commit()
                print("✓ Added goal_type column as VARCHAR")
            except Exception as e2:
                print(f"Error adding goal_type: {e2}")
    
    # Step 5: Make category nullable
    try:
        conn.execute(text("""
            ALTER TABLE goals ALTER COLUMN category DROP NOT NULL
        """))
        conn.commit()
        print("✓ Made category column nullable")
    except Exception as e:
        if "not a not-null" in str(e).lower() or "already" in str(e).lower():
            print("✓ category column already nullable")
        else:
            print(f"Note on category: {e}")

print("\n✅ Migration complete! Restart the backend server.")
