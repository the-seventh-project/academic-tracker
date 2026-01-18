# Assessment Routes
from flask import Blueprint, request, jsonify
from ..database import query_db, execute_db

assessments_bp = Blueprint('assessments', __name__)


@assessments_bp.route('/api/assessments/<int:course_id>', methods=['GET'])
def get_assessments(course_id):
    """Get all assessments for a course"""
    assessments = query_db(
        'SELECT * FROM "ASSESSMENT" WHERE course_id = ?',
        (course_id,)
    )
    return jsonify([dict(a) for a in assessments])


@assessments_bp.route('/api/add-assessment', methods=['POST'])
def add_assessment():
    """Add assessment to a course"""
    data = request.json

    assessment_id = execute_db(
        '''INSERT INTO "ASSESSMENT" (name, assessment_type, weight, marks, earned_marks, student_id, course_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (data['name'], data['assessment_type'], data['weight'], data['marks'],
         data.get('earned_marks'), data['student_id'], data['course_id'])
    )
    return jsonify({"success": True, "assessment_id": assessment_id})


@assessments_bp.route('/api/update-assessment/<int:assessment_id>', methods=['POST', 'PUT'])
def update_assessment(assessment_id):
    """Update assessment details"""
    data = request.json

    execute_db(
        '''UPDATE "ASSESSMENT" 
           SET name = ?, assessment_type = ?, weight = ?, marks = ?, earned_marks = ?
           WHERE assessment_id = ?''',
        (data['name'], data['assessment_type'], data['weight'],
         data['marks'], data.get('earned_marks'), assessment_id)
    )
    return jsonify({"success": True})


@assessments_bp.route('/api/delete-assessment/<int:assessment_id>', methods=['DELETE'])
def delete_assessment(assessment_id):
    """Delete an assessment"""
    execute_db('DELETE FROM "ASSESSMENT" WHERE assessment_id = ?', (assessment_id,))
    return jsonify({"success": True})
