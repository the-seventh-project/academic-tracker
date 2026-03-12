from flask import Blueprint, request, jsonify
from backend.services.forecast_service import calculate_gpa_forecast, calculate_course_grade_forecast
from backend.services.gpa_service import calculate_student_gpa

forecast_bp = Blueprint('forecast', __name__, url_prefix='/api/forecast')

@forecast_bp.route('/gpa', methods=['POST'])
def forecast_gpa():
    """
    Predict GPA.
    Input: {
        "student_id": 1, (optional, if provided calculates current summary from DB)
        "current_summary": { "cumulative_gpa": 3.0, "total_credits": 30 }, (optional override)
        "hypothetical_courses": [ { "code": "CS1", "credits": 3, "hypothetical": 90 }, ... ],
        "target_gpa": 3.5
    }
    """
    data = request.json
    
    current_summary = data.get('current_summary')
    student_id = data.get('student_id')
    
    if not current_summary and student_id:
        # Fetch actual current summary
        gpa_data = calculate_student_gpa(student_id)
        current_summary = {
            "cumulative_gpa": gpa_data.get('cumulative_gpa', 0),
            "total_credits": gpa_data.get('total_credits', 0)
        }
    
    if not current_summary:
        current_summary = {"cumulative_gpa": 0, "total_credits": 0}

    hypothetical = data.get('hypothetical_courses', [])
    target = data.get('target_gpa')
    
    result = calculate_gpa_forecast(current_summary, hypothetical, target)
    return jsonify(result)


@forecast_bp.route('/course-grade', methods=['POST'])
def forecast_grade():
    """
    Predict Course Grade.
    Input: {
        "assessments": [ { "name": "A1", "weight": 20, "mark": 80 }, { "name": "Final", "weight": 40 } ],
        "target_grade": 85
    }
    """
    data = request.json
    assessments = data.get('assessments', [])
    target = data.get('target_grade')
    
    result = calculate_course_grade_forecast(assessments, target)
    return jsonify(result)
