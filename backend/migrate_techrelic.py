"""
Migration script to update items table for Tech Relic system
Adds icon_name column and removes image_emoji
"""

import psycopg2

DATABASE_URL = "postgresql://postgres:Doogie70816@localhost:5432/focusflow"

def run_migration():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Add icon_name column if it doesn't exist
    try:
        cursor.execute("ALTER TABLE items ADD COLUMN icon_name VARCHAR(50)")
        print("✓ Added icon_name column to items")
    except psycopg2.errors.DuplicateColumn:
        print("Note: icon_name column already exists")
    except Exception as e:
        print(f"Error adding icon_name: {e}")
    
    # Delete old items to allow re-seeding with new Tech Relic items
    try:
        # First delete user_items references
        cursor.execute("DELETE FROM user_items")
        print("✓ Cleared user_items table")
        
        # Then delete items
        cursor.execute("DELETE FROM items")
        print("✓ Cleared items table (old emoji items)")
        print("Note: Restart backend to seed new Tech Relic items")
    except Exception as e:
        print(f"Error clearing items: {e}")
    
    cursor.close()
    conn.close()
    print("\nMigration complete! Restart backend to seed new items.")

if __name__ == "__main__":
    run_migration()
