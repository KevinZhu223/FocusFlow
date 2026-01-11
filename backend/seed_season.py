"""
Seed script for creating a Season in FocusFlow
Run this to create an active season for testing the global leaderboard
"""

import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/focusflow')

from models import init_db, Season

def create_season():
    engine, Session = init_db(DATABASE_URL)
    session = Session()
    
    try:
        # Check if active season exists
        existing = session.query(Season).filter(Season.is_active == True).first()
        if existing:
            print(f"Active season already exists: {existing.name}")
            return
        
        # Create new season
        now = datetime.utcnow()
        season = Season(
            name="January Jumpstart 2026",
            description="New year, new goals! Compete globally for exclusive rewards.",
            start_date=now,
            end_date=now + timedelta(days=30),
            is_active=True
        )
        
        session.add(season)
        session.commit()
        
        print(f"✅ Created season: {season.name}")
        print(f"   Start: {season.start_date}")
        print(f"   End: {season.end_date}")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
    finally:
        session.close()

if __name__ == '__main__':
    create_season()
