# GPA Calculation Routes
from flask import Blueprint, jsonify
from backend.database import query_db
from backend.services.gpa_service import calculate_student_gpa, calculate_gpa_breakdown, get_grading_scale
import logging

gpa_bp = Blueprint('gpa', __name__)
logger = logging.getLogger(__name__)


@gpa_bp.route('/api/calculate-gpa/<int:student_id>', methods=['GET'])
def calculate_gpa(student_id):
    """Calculate semester and cumulative GPA for a student"""
    try:
        result = calculate_student_gpa(student_id)
        return jsonify(result)
    except Exception as e:
        logger.error(f"GPA calculation error for student {student_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "GPA calculation failed", "message": str(e)}), 500


@gpa_bp.route('/api/gpa/<int:student_id>/breakdown', methods=['GET'])
def get_gpa_breakdown(student_id):
    """Get GPA breakdown by semester"""
    try:
        result = calculate_gpa_breakdown(student_id)
        return jsonify(result)
    except Exception as e:
        logger.error(f"GPA breakdown error for student {student_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "GPA breakdown failed", "message": str(e)}), 500


@gpa_bp.route('/api/config/grading-scale', methods=['GET'])
def get_grading_scale_route():
    """Get the global grading scale"""
    try:
        scale = get_grading_scale()
        return jsonify(scale)
    except Exception as e:
        logger.error(f"Grading scale error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to fetch grading scale", "message": str(e)}), 500

