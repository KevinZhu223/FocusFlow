"""Check and fix enum values in PostgreSQL"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

with engine.connect() as conn:
    # Check current enum values
    print("Checking enum values...")
    result = conn.execute(text("SELECT unnest(enum_range(NULL::timeframeenum))"))
    print("timeframeenum values:", [r[0] for r in result])
    
    result = conn.execute(text("SELECT unnest(enum_range(NULL::goaltypeenum))"))
    print("goaltypeenum values:", [r[0] for r in result])
    
    # The issue is that we need to add uppercase versions or change the backend to use lowercase
    # Let's try adding uppercase versions
    print("\nAdding uppercase enum values...")
    
    for val in ['DAILY', 'WEEKLY', 'MONTHLY']:
        try:
            conn.execute(text(f"ALTER TYPE timeframeenum ADD VALUE IF NOT EXISTS '{val}'"))
            print(f"  Added '{val}' to timeframeenum")
        except Exception as e:
            print(f"  Note for {val}: {e}")
    
    for val in ['TARGET', 'LIMIT']:
        try:
            conn.execute(text(f"ALTER TYPE goaltypeenum ADD VALUE IF NOT EXISTS '{val}'"))
            print(f"  Added '{val}' to goaltypeenum")
        except Exception as e:
            print(f"  Note for {val}: {e}")
    
    conn.commit()
    print("\n✅ Done! Restart the backend.")
