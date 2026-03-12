import sys
import os

sys.path.append(os.path.abspath('.'))

from backend.database import get_db_connection

def check_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT user_id, email FROM "USER"')
    print(cursor.fetchall())
    conn.close()

if __name__ == "__main__":
    check_users()
