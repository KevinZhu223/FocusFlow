"""
FocusFlow - Database Seeding Script
Seeds badges and demo leaderboard users
"""

import os
import sys
from datetime import datetime, timedelta
import random

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from models import Base, Badge, User, ActivityLog, CategoryEnum, SourceEnum, init_db
from gamification import BADGE_DEFINITIONS, seed_items, ITEM_DEFINITIONS

# Demo users for leaderboard
DEMO_USERS = [
    {"name": "Alice Chen", "email": "alice@demo.focusflow.app", "avatar_color": "#22c55e"},
    {"name": "Bob Smith", "email": "bob@demo.focusflow.app", "avatar_color": "#3b82f6"},
    {"name": "Carol Wu", "email": "carol@demo.focusflow.app", "avatar_color": "#f59e0b"},
    {"name": "David Kim", "email": "david@demo.focusflow.app", "avatar_color": "#8b5cf6"},
    {"name": "Emma Davis", "email": "emma@demo.focusflow.app", "avatar_color": "#ec4899"},
]


def seed_badges(session):
    """Seed all badge definitions into the database"""
    print("Seeding badges...")
    
    for badge_def in BADGE_DEFINITIONS:
        # Check if badge already exists
        existing = session.query(Badge).filter_by(name=badge_def["name"]).first()
        if existing:
            print(f"  Badge '{badge_def['name']}' already exists, skipping")
            continue
        
        badge = Badge(
            name=badge_def["name"],
            description=badge_def["description"],
            icon_name=badge_def["icon_name"]
        )
        session.add(badge)
        print(f"  Created badge: {badge_def['name']}")
    
    session.commit()
    print(f"✓ Seeded {len(BADGE_DEFINITIONS)} badges")


def seed_items_data(session):
    """Seed all collectible items into the database"""
    print("\nSeeding items...")
    count = seed_items(session)
    print(f"✓ Seeded {count} items")


def seed_demo_users(session):
    """Seed demo users for leaderboard with random activities"""
    print("\nSeeding demo leaderboard users...")
    
    categories = list(CategoryEnum)
    
    for user_data in DEMO_USERS:
        # Check if user already exists
        existing = session.query(User).filter_by(email=user_data["email"]).first()
        if existing:
            print(f"  User '{user_data['name']}' already exists, skipping")
            continue
        
        # Create user with random XP/level
        xp = random.randint(50, 500)
        level = int((xp ** 0.5) * 0.2) + 1
        
        user = User(
            email=user_data["email"],
            name=user_data["name"],
            password_hash=None,  # Demo users can't log in
            avatar_color=user_data["avatar_color"],
            is_public=True,  # Visible on leaderboard
            xp=xp,
            level=level,
            bio=f"Hi, I'm {user_data['name'].split()[0]}! Tracking my productivity with FocusFlow."
        )
        session.add(user)
        session.flush()  # Get the user ID
        
        # Add some random activities for the past week
        num_activities = random.randint(5, 15)
        for i in range(num_activities):
            days_ago = random.randint(0, 6)
            hours_ago = random.randint(0, 23)
            timestamp = datetime.utcnow() - timedelta(days=days_ago, hours=hours_ago)
            
            category = random.choice(categories)
            duration = random.randint(15, 180)
            
            # Calculate score (simplified)
            base_scores = {
                CategoryEnum.CAREER: 10,
                CategoryEnum.HEALTH: 8,
                CategoryEnum.SOCIAL: 5,
                CategoryEnum.CHORES: 4,
                CategoryEnum.LEISURE: -5
            }
            base = base_scores.get(category, 0)
            score = base * (duration / 60)
            
            activity = ActivityLog(
                user_id=user.id,
                raw_input=f"Demo activity {i+1}",
                activity_name=f"{category.value} activity",
                category=category,
                duration_minutes=duration,
                productivity_score=score,
                source=SourceEnum.MANUAL,
                timestamp=timestamp
            )
            session.add(activity)
        
        print(f"  Created user: {user_data['name']} (Level {level}, {num_activities} activities)")
    
    session.commit()
    print(f"✓ Seeded {len(DEMO_USERS)} demo users")


def main():
    """Main seeding function"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set in environment")
        sys.exit(1)
    
    print("=" * 50)
    print("FocusFlow Database Seeder")
    print("=" * 50)
    
    engine, Session = init_db(database_url)
    session = Session()
    
    try:
        seed_badges(session)
        seed_items(session)
        seed_demo_users(session)
        
        print("\n" + "=" * 50)
        print("✓ Seeding complete!")
        print("=" * 50)
    except Exception as e:
        print(f"\nERROR: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
