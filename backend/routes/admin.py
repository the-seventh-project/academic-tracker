# Admin Routes
from flask import Blueprint, jsonify
from backend.database import query_db, execute_db
from backend.services.gpa_service import calculate_student_gpa

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/students', methods=['GET'])
def get_all_students():
    """Get all students (admin only)"""
    students = query_db(
        '''SELECT user_id, firstname, lastname, email 
           FROM "USER" WHERE user_type = 'Student' '''
    )
    return jsonify([dict(s) for s in students])


@admin_bp.route('/delete-student/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    """Delete a student and all related data"""
    try:
        # Delete assessments for student
        execute_db('DELETE FROM "ASSESSMENT" WHERE student_id = ?', (student_id,))
        
        # Delete assessments for courses owned by student
        execute_db(
            '''DELETE FROM "ASSESSMENT" WHERE course_id IN 
               (SELECT course_id FROM "COURSE" WHERE student_id = ?)''',
            (student_id,)
        )
        
        # Delete courses
        execute_db('DELETE FROM "COURSE" WHERE student_id = ?', (student_id,))
        
        # Delete user
        execute_db('DELETE FROM "USER" WHERE user_id = ?', (student_id,))
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@admin_bp.route('/student/<int:student_id>/gpa', methods=['GET'])
def get_student_gpa(student_id):
    """Get GPA for a specific student (admin view)"""
    result = calculate_student_gpa(student_id)
    return jsonify(result)
