import os
import sqlite3
from sqlalchemy import create_engine, text

def verify():
    output_lines = []
    tables = ['user', 'commute_log', 'tree_plantation', 'notification', 'challenge', 'achievement', 'user_achievement', 'event', 'event_participant', 'activity_log']
    
    # 1. Check SQLite
    sqlite_path = 'instance/ecotrace.db'
    if not os.path.exists(sqlite_path):
        print(f" SQLite file not found at {sqlite_path}")
        sqlite_counts = {}
    else:
        conn = sqlite3.connect(sqlite_path)
        cursor = conn.cursor()
        sqlite_counts = {}
        for t in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {t}")
                sqlite_counts[t] = cursor.fetchone()[0]
            except Exception:
                sqlite_counts[t] = 0
        conn.close()

    # 2. Check Supabase
    from dotenv import load_dotenv
    load_dotenv(override=True)
    db_url = os.environ.get('DATABASE_URL')
    
    if not db_url:
         print("❌ Error: DATABASE_URL not found in environment")
         return
         
    if db_url.startswith("postgres://"):
         db_url = db_url.replace("postgres://", "postgresql://", 1)

    pg_counts = {}
    try:
        engine = create_engine(db_url)
        from sqlalchemy import inspect
        inspector = inspect(engine)
        pg_tables = inspector.get_table_names()
        output_lines.append(f"ℹ️ Supabase Tables Found: {pg_tables}")

        with engine.connect() as conn:
             for t in tables:
                  try:
                       # Find exact case match from inspector
                       exact_t = next((pt for pt in pg_tables if pt.lower() == t.lower()), t)
                       res = conn.execute(text(f"SELECT COUNT(*) FROM \"{exact_t}\""))
                       pg_counts[t] = res.scalar()
                  except Exception as e:
                       # Rollback current transaction so future reads aren't aborted
                       try: conn.execute(text("ROLLBACK")) 
                       except: pass
                       output_lines.append(f"⚠️ Error reading {t} (as {exact_t}) on Supabase: {e}")
                       pg_counts[t] = "Error"
    except Exception as e:
         print(f"❌ Error connecting to Postgres: {e}")
         return

    output_lines.append("\n📊 --- DATA MIGRATION VERIFICATION ---")
    output_lines.append(f"{'Table Name':<20} | {'SQLite Count':<12} | {'Supabase Count':<14}")
    output_lines.append("-" * 52)
    for t in tables:
        sq_val = sqlite_counts.get(t, 0)
        pg_val = pg_counts.get(t, 0)
        output_lines.append(f"{t:<20} | {sq_val:<12} | {pg_val:<14}")

    full_output = "\n".join(output_lines)
    print(full_output)
    with open('verify_output.txt', 'w', encoding='utf-8') as f:
         f.write(full_output)

if __name__ == '__main__':
    verify()
