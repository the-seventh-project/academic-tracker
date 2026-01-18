# Student API Routes
# Profile, Historical Performance, and Grade Prediction
from flask import Blueprint, request, jsonify
from ..database import query_db, execute_db
from ..services.gpa_service import calculate_student_gpa

students_bp = Blueprint('students', __name__, url_prefix='/api/students')


@students_bp.route('/<int:user_id>/profile', methods=['GET'])
def get_profile(user_id):
    """Get student profile information"""
    try:
        user = query_db(
            '''SELECT user_id, firstname, lastname, email, user_type,
                      student_id, major, level
               FROM "USER" WHERE user_id = ?''',
            (user_id,),
            one=True
        )

        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404

        return jsonify({
            "success": True,
            "user_id": user['user_id'],
            "firstname": user['firstname'],
            "lastname": user['lastname'],
            "email": user['email'],
            "user_type": user['user_type'],
            "student_id": user.get('student_id') or "",
            "major": user.get('major') or "",
            "level": user.get('level') or ""
        })
    except Exception:
        # Columns might not exist - return basic info
        user = query_db(
            'SELECT user_id, firstname, lastname, email, user_type FROM "USER" WHERE user_id = ?',
            (user_id,), one=True
        )
        if user:
            return jsonify({
                "success": True,
                "user_id": user['user_id'],
                "firstname": user['firstname'],
                "lastname": user['lastname'],
                "email": user['email'],
                "user_type": user['user_type'],
                "student_id": "",
                "major": "",
                "level": ""
            })
        return jsonify({"success": False, "error": "User not found"}), 404


@students_bp.route('/<int:user_id>/profile', methods=['PUT', 'POST'])
def update_profile(user_id):
    """Update student profile"""
    data = request.json

    try:
        execute_db(
            '''UPDATE "USER" 
               SET student_id = ?, major = ?, level = ?
               WHERE user_id = ?''',
            (data.get('student_id', ''), data.get('major', ''),
             data.get('level', ''), user_id)
        )
        return jsonify({"success": True, "message": "Profile updated successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@students_bp.route('/<int:student_id>/historical-performance', methods=['GET'])
def get_historical_performance(student_id):
    """Get aggregated historical data for trend-based predictions"""
    try:
        assessments = query_db(
            '''SELECT a.assessment_type, a.earned_marks, a.marks, c.semester
               FROM "ASSESSMENT" a
               JOIN "COURSE" c ON a.course_id = c.course_id
               WHERE a.student_id = ? AND a.earned_marks IS NOT NULL''',
            (student_id,)
        )

        if not assessments:
            return jsonify({
                "student_id": student_id,
                "data_quality": {"total_assessments": 0, "confidence_score": 0},
                "component_averages": {
                    "Assignment": 80.0, "Quiz": 80.0, "Midterm": 75.0, 
                    "Final": 75.0, "Project": 80.0
                },
                "overall_trend_factor": 1.0,
                "component_trend_factors": {}
            })

        # Calculate component averages
        component_data = {}
        semester_data = {}

        for a in assessments:
            ass_type = a['assessment_type']
            pct = (a['earned_marks'] / a['marks']) * 100 if a['marks'] > 0 else 0
            semester = a['semester']

            if ass_type not in component_data:
                component_data[ass_type] = []
            component_data[ass_type].append(pct)

            if semester not in semester_data:
                semester_data[semester] = []
            semester_data[semester].append(pct)

        component_averages = {
            t: round(sum(s) / len(s), 2) for t, s in component_data.items()
        }

        # Calculate trend factors
        component_trend_factors = {}
        for comp_type, scores in component_data.items():
            if len(scores) >= 2:
                mid = len(scores) // 2
                first_half = sum(scores[:mid]) / mid if mid > 0 else scores[0]
                second_half = sum(scores[mid:]) / (len(scores) - mid)
                trend = second_half / first_half if first_half > 0 else 1.0
                component_trend_factors[comp_type] = round(min(max(trend, 0.8), 1.2), 3)
            else:
                component_trend_factors[comp_type] = 1.0

        # Overall trend
        overall_trend = 1.0
        if len(semester_data) >= 2:
            sem_avgs = [sum(s)/len(s) for s in semester_data.values()]
            mid = len(sem_avgs) // 2
            if mid > 0:
                old_avg = sum(sem_avgs[:mid]) / mid
                new_avg = sum(sem_avgs[mid:]) / (len(sem_avgs) - mid)
                if old_avg > 0:
                    overall_trend = round(min(max(new_avg / old_avg, 0.8), 1.2), 3)

        confidence_score = round(min(len(assessments) / 20, 1.0), 2)

        return jsonify({
            "student_id": student_id,
            "data_quality": {
                "total_assessments": len(assessments),
                "confidence_score": confidence_score,
                "semesters_covered": len(semester_data)
            },
            "component_averages": component_averages,
            "overall_trend_factor": overall_trend,
            "component_trend_factors": component_trend_factors
        })

    except Exception as e:
        return jsonify({
            "success": False, "error": str(e),
            "component_averages": {"Assignment": 80.0, "Quiz": 80.0, "Midterm": 75.0, "Final": 75.0, "Project": 80.0},
            "overall_trend_factor": 1.0
        }), 500


@students_bp.route('/<int:student_id>/semester-timeline', methods=['GET'])
def get_semester_timeline(student_id):
    """Get semester-by-semester performance"""
    try:
        assessments = query_db(
            '''SELECT a.assessment_type, a.earned_marks, a.marks, c.semester
               FROM "ASSESSMENT" a
               JOIN "COURSE" c ON a.course_id = c.course_id
               WHERE a.student_id = ? AND a.earned_marks IS NOT NULL
               ORDER BY c.semester''',
            (student_id,)
        )

        if not assessments:
            return jsonify({"timeline": []})

        semester_data = {}
        for a in assessments:
            sem = a['semester']
            pct = (a['earned_marks'] / a['marks']) * 100 if a['marks'] > 0 else 0
            if sem not in semester_data:
                semester_data[sem] = {'by_type': {}, 'all': []}

            t = a['assessment_type']
            if t not in semester_data[sem]['by_type']:
                semester_data[sem]['by_type'][t] = []
            semester_data[sem]['by_type'][t].append(pct)
            semester_data[sem]['all'].append(pct)

        timeline = []
        for sem in sorted(semester_data.keys()):
            d = semester_data[sem]
            avgs = {t: round(sum(s)/len(s), 2) for t, s in d['by_type'].items()}
            timeline.append({
                "semester": sem,
                "assessment_averages": avgs,
                "overall_average": round(sum(d['all'])/len(d['all']), 2)
            })

        return jsonify({"timeline": timeline})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@students_bp.route('/<int:student_id>/predict-grade', methods=['POST'])
def predict_grade(student_id):
    """Predict grades based on historical trends"""
    data = request.json
    target = data.get('target_grade', 75)
    completed = data.get('completed_assessments', [])
    pending = data.get('pending_assessments', [])

    if not pending:
        return jsonify({"success": False, "error": "No pending assessments"}), 400

    # Get historical trend
    try:
        hist_response = get_historical_performance(student_id)
        hist_data = hist_response.get_json() if hasattr(hist_response, 'get_json') else {}
        trend = hist_data.get('overall_trend_factor', 1.0)
        component_trends = hist_data.get('component_trend_factors', {})
    except:
        trend = 1.0
        component_trends = {}

    earned = sum((a.get('score', 0) / 100) * a.get('weight', 0) for a in completed)
    pending_weight = sum(a.get('weight', 0) for a in pending)
    needed = target - earned
    base_score = (needed / pending_weight) * 100 if pending_weight > 0 else 0

    predictions = []
    n = len(pending)

    for i, a in enumerate(pending):
        ass_type = a.get('type', 'Unknown')
        weight = a.get('weight', 0)
        type_trend = component_trends.get(ass_type, trend)
        pos_factor = 0.8 + (0.4 * (i / max(n - 1, 1))) if n > 1 else 1.0
        predicted = min(100, max(0, base_score * pos_factor * type_trend))

        predictions.append({
            "type": ass_type,
            "weight": weight,
            "predicted_score": round(predicted, 1),
            "position_factor": round(pos_factor, 3),
            "type_trend": round(type_trend, 3)
        })

    predicted_total = earned + sum((p['predicted_score'] / 100) * p['weight'] for p in predictions)

    return jsonify({
        "success": True,
        "predictions": predictions,
        "summary": {
            "target_grade": target,
            "earned_so_far": round(earned, 2),
            "projected_final": round(predicted_total, 2),
            "meets_target": predicted_total >= target - 0.5
        },
        "trend_info": {
            "overall_trend_factor": trend,
            "method": "trend_based" if trend != 1.0 else "standard"
        }
    })
