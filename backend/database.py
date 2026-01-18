import sqlite3
# Note: psycopg2 is imported lazily inside get_db_connection 
# to avoid compatibility issues during startup

from backend.config import config

def sanitize_db_uri(uri):
    """Clean up common database URL mistakes."""
    if not uri:
        return uri
    
    # Remove leading/trailing quotes and spaces (accidental paste issues)
    uri = uri.strip().strip("'").strip('"')
    
    # If the user copied the 'psql' command instead of just the URL
    if uri.startswith('psql '):
        uri = uri.split('"', 1)[1].rsplit('"', 1)[0] if '"' in uri else uri.replace('psql ', '')

    # Fix postgres:// -> postgresql:// (required by newer drivers/SQLAlchemy)
    if uri.startswith('postgres://'):
        uri = uri.replace('postgres://', 'postgresql://', 1)
        
    return uri

def get_db_connection():
    """Get a database connection based on the configuration."""
    db_uri = sanitize_db_uri(config.SQLALCHEMY_DATABASE_URI)
    
    if db_uri.startswith('sqlite'):
        # SQLite connection
        db_path = db_uri.replace('sqlite:///', '')
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn
    else:
        # PostgreSQL connection (for Render/Neon)
        import psycopg2
        return psycopg2.connect(db_uri)

def get_cursor(conn):
    """Get a cursor that returns results as dictionaries."""
    if isinstance(conn, sqlite3.Connection):
        return conn.cursor()
    else:
        # Lazy import to avoid startup issues
        from psycopg2.extras import RealDictCursor
        # Use RealDictCursor for PostgreSQL to match sqlite3.Row behavior
        return conn.cursor(cursor_factory=RealDictCursor)

def format_query(query, conn):
    """Adjust query placeholders based on database type."""
    if isinstance(conn, sqlite3.Connection):
        return query # SQLite uses ?
    else:
        return query.replace('?', '%s') # PostgreSQL uses %s

def query_db(query, args=(), one=False):
    """Execute SELECT query and return results."""
    conn = get_db_connection()
    try:
        formatted_query = format_query(query, conn)
        cursor = get_cursor(conn)
        cursor.execute(formatted_query, args)
        result = cursor.fetchall()
        return (result[0] if result else None) if one else result
    finally:
        conn.close()

def execute_db(query, args=()):
    """Execute INSERT/UPDATE/DELETE query."""
    conn = get_db_connection()
    try:
        formatted_query = format_query(query, conn)
        cursor = get_cursor(conn)
        cursor.execute(formatted_query, args)
        conn.commit()
        # Handle lastrowid for PostgreSQL
        if not isinstance(conn, sqlite3.Connection):
            # For PostgreSQL, we typically use RETURNING id, but for now 
            # we'll try to emulate lastrowid if possible (limited support)
            try:
                last_id = cursor.lastrowid
            except AttributeError:
                last_id = None
        else:
            last_id = cursor.lastrowid
        return last_id
    finally:
        conn.close()
