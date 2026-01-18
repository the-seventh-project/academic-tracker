# Config Service
# Handles retrieval of system configuration and static data
from backend.database import query_db

def get_assessment_types() -> list:
    """
    Get all assessment types (Assignment, Quiz, etc.) with defaults.
    """
    types = query_db('SELECT * FROM "ASSESSMENT_TYPE" ORDER BY name')
    if not types:
        return []
    return [dict(row) for row in types]

def get_semesters() -> list:
    """
    Get available semesters (Mock implementation for now, or DB backed later).
    """
    # Ideally this would also be in DB, but for now we centralize it here.
    return ["Spring 2025", "Summer 2025", "Fall 2025", "Winter 2025"]
