# Course Routes
from flask import Blueprint, request, jsonify
from backend.database import query_db, execute_db
import logging

courses_bp = Blueprint('courses', __name__)
logger = logging.getLogger(__name__)


@courses_bp.route('/api/courses/<int:student_id>', methods=['GET'])
def get_courses(student_id):
    """Get all courses for a student"""
    try:
        courses = query_db(
            'SELECT * FROM "COURSE" WHERE student_id = ?',
            (student_id,)
        )
        return jsonify([dict(course) for course in courses])
    except Exception as e:
        logger.error(f"Get courses error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to fetch courses", "message": str(e)}), 500


@courses_bp.route('/api/course/<int:course_id>', methods=['GET'])
def get_course(course_id):
    """Get a specific course"""
    try:
        course = query_db(
            'SELECT * FROM "COURSE" WHERE course_id = ?',
            (course_id,),
            one=True
        )
        if course:
            return jsonify(dict(course))
        return jsonify({"error": "Course not found"}), 404
    except Exception as e:
        logger.error(f"Get course error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to fetch course", "message": str(e)}), 500


@courses_bp.route('/api/add-course', methods=['POST'])
def add_course():
    """Add a new course"""
    try:
        data = request.get_json(silent=True) or {}

        required = ['course_code', 'course_name', 'credit_hours', 'semester', 'student_id']
        missing = [f for f in required if f not in data or data[f] is None]
        if missing:
            return jsonify({"success": False, "error": f"Missing required fields: {', '.join(missing)}"}), 400

        from backend.database import get_db_connection
        import sqlite3
        conn = get_db_connection()
        is_postgres = not isinstance(conn, sqlite3.Connection)
        conn.close()

        sql = '''INSERT INTO "COURSE" (course_code, course_name, credit_hours, semester, student_id)
                 VALUES (?, ?, ?, ?, ?)'''
        if is_postgres:
            sql += ' RETURNING course_id'

        course_id = execute_db(
            sql,
            (data['course_code'], data['course_name'], data['credit_hours'],
             data['semester'], data['student_id'])
        )
        return jsonify({"success": True, "course_id": course_id})
    except Exception as e:
        logger.error(f"Add course error: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@courses_bp.route('/api/update-course/<int:course_id>', methods=['POST', 'PUT'])
def update_course(course_id):
    """Update course details"""
    data = request.json
    course_code = data.get('course_code')
    course_name = data.get('course_name')
    credit_hours = data.get('credit_hours')
    semester = data.get('semester')

    if not course_code or not course_name:
        return jsonify({"success": False, "error": "Missing required fields"}), 400

    try:
        execute_db(
            'UPDATE "COURSE" SET course_code = ?, course_name = ?, credit_hours = ?, semester = ? WHERE course_id = ?',
            (course_code, course_name, credit_hours, semester, course_id)
        )
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@courses_bp.route('/api/delete-course/<int:course_id>', methods=['DELETE'])
def delete_course(course_id):
    """Delete a course and its assessments"""
    execute_db('DELETE FROM "ASSESSMENT" WHERE course_id = ?', (course_id,))
    execute_db('DELETE FROM "COURSE" WHERE course_id = ?', (course_id,))
    return jsonify({"success": True})
