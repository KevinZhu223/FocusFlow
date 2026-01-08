"""
Fix items table schema for Tech Relic system
"""
import psycopg2

DATABASE_URL = "postgresql://postgres:Doogie70816@localhost:5432/focusflow"

ITEMS = [
    ("Code Snippet", "COMMON", "FileCode", "A reusable piece of wisdom."),
    ("Coffee Cup", "COMMON", "Coffee", "The fuel that powers all code."),
    ("Bug Fix", "COMMON", "Bug", "A squashed bug. Celebrate."),
    ("Terminal Line", "COMMON", "Terminal", "Command the machine."),
    ("Git Commit", "COMMON", "GitCommit", "Proof you did something."),
    ("Keyboard Key", "COMMON", "Keyboard", "From a well-worn keyboard."),
    ("Binary Fragment", "COMMON", "Binary", "01101000 01101001."),
    ("Power Cable", "COMMON", "Cable", "Keep electrons flowing."),
    ("RAM Stick", "RARE", "MemoryStick", "16GB of pure possibility."),
    ("Hard Drive", "RARE", "HardDrive", "1TB of potential."),
    ("Database Shard", "RARE", "Database", "Infinite knowledge."),
    ("Wifi Signal", "RARE", "Wifi", "Full bars. Max productivity."),
    ("Shield Protocol", "RARE", "Shield", "Digital protection."),
    ("Circuit Board", "RARE", "CircuitBoard", "Foundation of tech."),
    ("GPU Core", "LEGENDARY", "Cpu", "Raw computational power."),
    ("Cloud Server", "LEGENDARY", "Cloud", "Infinite scale."),
    ("Blockchain Node", "LEGENDARY", "Boxes", "Decentralized. Immutable."),
    ("AI Model", "LEGENDARY", "Bot", "Trained on millions of hours."),
    ("Quantum Core", "MYTHIC", "Atom", "Exists in all states."),
    ("The Singularity", "MYTHIC", "Sparkles", "Infinite productivity."),
]

def fix_and_seed():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("Fixing items table schema...")
    
    # Make image_emoji nullable if it exists
    try:
        cursor.execute("ALTER TABLE items ALTER COLUMN image_emoji DROP NOT NULL")
        print("✓ Made image_emoji nullable")
    except Exception as e:
        print(f"Note: {e}")
    
    # Ensure icon_name exists
    try:
        cursor.execute("ALTER TABLE items ADD COLUMN IF NOT EXISTS icon_name VARCHAR(50)")
        print("✓ Ensured icon_name column exists")
    except Exception as e:
        print(f"Note: {e}")
    
    # Clear and re-seed
    cursor.execute("DELETE FROM user_items")
    cursor.execute("DELETE FROM items")
    print("✓ Cleared old items")
    
    # Insert new items
    for name, rarity, icon, desc in ITEMS:
        cursor.execute(
            "INSERT INTO items (name, rarity, icon_name, description) VALUES (%s, %s, %s, %s)",
            (name, rarity, icon, desc)
        )
        print(f"  + {name}")
    
    print(f"\n✓ Seeded {len(ITEMS)} Tech Relic items!")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    fix_and_seed()
