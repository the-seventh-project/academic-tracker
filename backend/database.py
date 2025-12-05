import sqlite3

def get_db_connection():
    """Create database connection with Row factory"""
    conn = sqlite3.connect('gpa_calculator.db')
    conn.row_factory = sqlite3.Row
    return conn

def query_db(query, args=(), one=False):
    """Execute SELECT query and return results"""
    conn = get_db_connection()
    cursor = conn.execute(query, args)
    result = cursor.fetchall()
    conn.close()
    return (result[0] if result else None) if one else result

def execute_db(query, args=()):
    """Execute INSERT/UPDATE/DELETE query"""
    conn = get_db_connection()
    cursor = conn.execute(query, args)
    conn.commit()
    last_id = cursor.lastrowid
    conn.close()
    return last_id
