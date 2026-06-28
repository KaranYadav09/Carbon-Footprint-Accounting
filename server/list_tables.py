import sqlite3
import os

db_path = 'instance/ecotrace.db'
if not os.path.exists(db_path):
    print("❌ Error: database file not found at " + db_path)
    exit()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("📋 --- SQLite Tables ---")
for t in tables:
    table_name = t[0]
    cursor.execute(f"SELECT COUNT(*) FROM \"{table_name}\"")
    count = cursor.fetchone()[0]
    print(f"{table_name:20} | {count}")
conn.close()
