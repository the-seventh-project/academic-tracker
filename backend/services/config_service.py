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
    Get available semesters grouped by year.
    To add a new year, append a new entry to SEMESTER_YEARS.
    """
    SEMESTER_YEARS = [2026, 2025]
    SEMESTER_TERMS = ["Spring", "Summer", "Fall"]
    result = []
    for year in SEMESTER_YEARS:
        for term in SEMESTER_TERMS:
            result.append(f"{term} {year}")
    return result
