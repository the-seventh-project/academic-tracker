import sqlite3
# Note: psycopg2 is imported lazily inside get_db_connection 
# to avoid compatibility issues during startup

from backend.config import config

def sanitize_db_uri(uri):
    """Aggressively clean up database URL from environment variable mistakes."""
    if not uri:
        return uri
    
    # 1. Strip ALL whitespace and ALL variations of single/double quotes from both ends
    # This handles "'url'", '"url"', or " 'url' "
    uri = uri.strip().strip("'").strip('"').strip("'").strip('"').strip()
    
    # 2. Handle cases where the user might have pasted a shell command 'psql "..." '
    if 'postgresql://' in uri and 'psql' in uri.lower():
        # Just grab the part that starts with postgresql:// and ends before the next quote/space
        import re
        match = re.search(r'(postgresql?://[^\s\'"]+)', uri)
        if match:
            uri = match.group(1)

    # 3. Standardize driver name (SQLAlchemy/psycopg2 requires postgresql://)
    if uri.startswith('postgres://'):
        uri = uri.replace('postgres://', 'postgresql://', 1)
        
    return uri.strip()

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
