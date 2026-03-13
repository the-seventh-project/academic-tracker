from flask import Blueprint, jsonify
from backend.services.config_service import get_assessment_types, get_semesters
import logging

config_bp = Blueprint('config', __name__)
logger = logging.getLogger(__name__)

@config_bp.route('/api/config/assessment-types', methods=['GET'])
def assessment_types():
    """Get list of available assessment types"""
    try:
        types = get_assessment_types()
        return jsonify(types)
    except Exception as e:
        logger.error(f"Assessment types error: {str(e)}", exc_info=True)
        # Return sensible defaults so the UI doesn't break
        return jsonify([
            {"name": "Assignment", "default_weight": 10.0, "color": "#bb86fc"},
            {"name": "Quiz", "default_weight": 5.0, "color": "#03dac6"},
            {"name": "Midterm", "default_weight": 20.0, "color": "#d76d77"},
            {"name": "Final", "default_weight": 30.0, "color": "#3a1c71"},
            {"name": "Project", "default_weight": 15.0, "color": "#ffaf7b"},
            {"name": "Lab", "default_weight": 10.0, "color": "#ff8c00"},
            {"name": "Participation", "default_weight": 5.0, "color": "#cf6679"}
        ])

@config_bp.route('/api/config/semesters', methods=['GET'])
def semesters():
    """Get list of available semesters"""
    try:
        result = get_semesters()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Semesters error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to fetch semesters", "message": str(e)}), 500
