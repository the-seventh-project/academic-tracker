# Course Routes
from flask import Blueprint, request, jsonify
from backend.database import query_db, execute_db

courses_bp = Blueprint('courses', __name__)


@courses_bp.route('/api/courses/<int:student_id>', methods=['GET'])
def get_courses(student_id):
    """Get all courses for a student"""
    courses = query_db(
        'SELECT * FROM "COURSE" WHERE student_id = ?',
        (student_id,)
    )
    return jsonify([dict(course) for course in courses])


@courses_bp.route('/api/course/<int:course_id>', methods=['GET'])
def get_course(course_id):
    """Get a specific course"""
    course = query_db(
        'SELECT * FROM "COURSE" WHERE course_id = ?',
        (course_id,),
        one=True
    )
    if course:
        return jsonify(dict(course))
    return jsonify({"error": "Course not found"}), 404


@courses_bp.route('/api/add-course', methods=['POST'])
def add_course():
    """Add a new course"""
    data = request.json

    sql = '''INSERT INTO "COURSE" (course_code, course_name, credit_hours, semester, student_id)
             VALUES (?, ?, ?, ?, ?)'''
    
    # Check if we are using Postgres (for Render) to add RETURNING
    from backend.database import get_db_connection
    conn = get_db_connection()
    import sqlite3
    if not isinstance(conn, sqlite3.Connection):
         sql += ' RETURNING course_id'
    conn.close()

    course_id = execute_db(
        sql,
        (data['course_code'], data['course_name'], data['credit_hours'],
         data['semester'], data['student_id'])
    )
    return jsonify({"success": True, "course_id": course_id})


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
