"""
Migration script to add is_broken column to user_items table
and birth_year column to users table
"""

import os
import psycopg2

# Use the same connection string as your app
DATABASE_URL = "postgresql://postgres:Doogie70816@localhost:5432/focusflow"

def run_migration():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Add birth_year to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN birth_year INTEGER")
        print("✓ Added birth_year column to users")
    except psycopg2.errors.DuplicateColumn:
        print("Note: birth_year column already exists")
    except Exception as e:
        print(f"Error adding birth_year: {e}")
    
    # Add is_broken to user_items
    try:
        cursor.execute("ALTER TABLE user_items ADD COLUMN is_broken BOOLEAN DEFAULT FALSE")
        print("✓ Added is_broken column to user_items")
    except psycopg2.errors.DuplicateColumn:
        print("Note: is_broken column already exists")
    except Exception as e:
        print(f"Error adding is_broken: {e}")
    
    cursor.close()
    conn.close()
    print("\nMigration complete!")

if __name__ == "__main__":
    run_migration()
