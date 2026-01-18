# GPA Calculation Routes
from flask import Blueprint, jsonify
from ..database import query_db
from ..services.gpa_service import calculate_student_gpa, calculate_gpa_breakdown, get_grading_scale

gpa_bp = Blueprint('gpa', __name__)


@gpa_bp.route('/api/calculate-gpa/<int:student_id>', methods=['GET'])
def calculate_gpa(student_id):
    """Calculate semester and cumulative GPA for a student"""
    result = calculate_student_gpa(student_id)
    return jsonify(result)


@gpa_bp.route('/api/gpa/<int:student_id>/breakdown', methods=['GET'])
def get_gpa_breakdown(student_id):
    """Get GPA breakdown by semester"""
    result = calculate_gpa_breakdown(student_id)
    return jsonify(result)


@gpa_bp.route('/api/config/grading-scale', methods=['GET'])
def get_grading_scale_route():
    """Get the global grading scale"""
    scale = get_grading_scale()
    return jsonify(scale)

