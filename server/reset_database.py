import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def reset():
    load_dotenv(override=True)
    db_url = os.environ.get('DATABASE_URL')
    
    if not db_url:
        print("❌ Error: DATABASE_URL not found")
        return
        
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    print("--- Connecting to Supabase and Wiping Data ---")
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            # List tables ordered for cascade drops 
            tables = ['challenge_participant', 'challenge', 'user_achievement', 'achievement', 'notification', 'event_proof', 'event_participant', 'event', 'commute_log', 'tree_plantation', 'activity_log', 'user']
            
            for t in tables:
                try:
                    conn.execute(text(f"DROP TABLE IF EXISTS \"{t}\" CASCADE"))
                    print(f"Dropped table {t}")
                except Exception as e:
                    print(f"Error dropping {t}: {e}")
            conn.execute(text("COMMIT"))
            print("✅ All tables dropped from Supabase!")
    except Exception as e:
        print(f"❌ Error during reset: {e}")

if __name__ == '__main__':
    reset()
