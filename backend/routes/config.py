from flask import Blueprint, jsonify
from ..services.config_service import get_assessment_types, get_semesters

config_bp = Blueprint('config', __name__)

@config_bp.route('/api/config/assessment-types', methods=['GET'])
def assessment_types():
    """Get list of available assessment types"""
    types = get_assessment_types()
    return jsonify(types)

@config_bp.route('/api/config/semesters', methods=['GET'])
def semesters():
    """Get list of available semesters"""
    semesters = get_semesters()
    return jsonify(semesters)
