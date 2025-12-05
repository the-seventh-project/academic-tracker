from flask import Flask, request, jsonify
from flask_cors import CORS
from database import query_db, execute_db
import requests
import sqlite3

app = Flask(__name__)
CORS(app)  # Allow frontend to call backend


@app.route('/', methods=['GET'])
def home():
    """Root endpoint to verify server is running"""
    return jsonify({
        "message": "Academic Tracker Backend is running!",
        "status": "online",
        "endpoints": [
            "/login",
            "/register",
            "/courses/<student_id>",
            "/calculate-gpa/<student_id>",
            "/campus-weather",
            "/api/students/<user_id>/profile",
            "/api/students/<student_id>/historical-performance",
            "/api/students/<student_id>/predict-grade"
        ]
    })

# ============ AUTHENTICATION ROUTES ============


@app.route('/login', methods=['POST'])
def login():
    """Student/Admin login"""
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = query_db(
        'SELECT * FROM USER WHERE email = ? AND password = ?',
        (email, password),
        one=True
    )

    if user:
        return jsonify({
            "success": True,
            "user": {
                "id": user['user_id'],
                "name": f"{user['firstname']} {user['lastname']}",
                "email": user['email'],
                "type": user['user_type']
            }
        })
    else:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401


@app.route('/register', methods=['POST'])
def register():
    """Register new student"""
    data = request.json

    try:
        user_id = execute_db(
            '''INSERT INTO USER (firstname, lastname, email, password, user_type)
               VALUES (?, ?, ?, ?, 'Student')''',
            (data['firstname'], data['lastname'],
             data['email'], data['password'])
        )
        return jsonify({"success": True, "user_id": user_id})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400


@app.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset user password"""
    data = request.json
    email = data.get('email')
    new_password = data.get('new_password')

    # Check if user exists
    user = query_db('SELECT * FROM USER WHERE email = ?', (email,), one=True)

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    try:
        execute_db(
            'UPDATE USER SET password = ? WHERE email = ?',
            (new_password, email)
        )
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# ============ COURSE ROUTES ============


@app.route('/courses/<int:student_id>', methods=['GET'])
def get_courses(student_id):
    """Get all courses for a student"""
    courses = query_db(
        'SELECT * FROM COURSE WHERE student_id = ?',
        (student_id,)
    )
    return jsonify([dict(course) for course in courses])


@app.route('/add-course', methods=['POST'])
def add_course():
    """Add a new course"""
    data = request.json

    course_id = execute_db(
        '''INSERT INTO COURSE (course_code, course_name, credit_hours, semester, student_id)
           VALUES (?, ?, ?, ?, ?)''',
        (data['course_code'], data['course_name'], data['credit_hours'],
         data['semester'], data['student_id'])
    )
    return jsonify({"success": True, "course_id": course_id})


@app.route('/course/<int:course_id>', methods=['GET'])
def get_course(course_id):
    """Get details for a specific course"""
    course = query_db(
        'SELECT * FROM COURSE WHERE course_id = ?',
        (course_id,),
        one=True
    )
    if course:
        return jsonify(dict(course))
    else:
        return jsonify({"error": "Course not found"}), 404


@app.route('/update-course/<int:course_id>', methods=['POST', 'PUT'])
def update_course(course_id):
    """Update course details (code, name, credits, semester)"""
    data = request.json
    # Basic validation
    course_code = data.get('course_code')
    course_name = data.get('course_name')
    credit_hours = data.get('credit_hours')
    semester = data.get('semester')

    if not course_code or not course_name:
        return jsonify({"success": False, "error": "Missing required fields"}), 400

    try:
        execute_db(
            'UPDATE COURSE SET course_code = ?, course_name = ?, credit_hours = ?, semester = ? WHERE course_id = ?',
            (course_code, course_name, credit_hours, semester, course_id)
        )
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/delete-course/<int:course_id>', methods=['DELETE'])
def delete_course(course_id):
    """Delete a course and its assessments"""
    # Remove assessments that belong to the course first to avoid orphaned rows
    execute_db('DELETE FROM ASSESSMENT WHERE course_id = ?', (course_id,))
    execute_db('DELETE FROM COURSE WHERE course_id = ?', (course_id,))
    return jsonify({"success": True})

# ============ ASSESSMENT ROUTES ============


@app.route('/assessments/<int:course_id>', methods=['GET'])
def get_assessments(course_id):
    """Get all assessments for a course"""
    assessments = query_db(
        'SELECT * FROM ASSESSMENT WHERE course_id = ?',
        (course_id,)
    )
    return jsonify([dict(assessment) for assessment in assessments])


@app.route('/add-assessment', methods=['POST'])
def add_assessment():
    """Add assessment to a course"""
    data = request.json

    assessment_id = execute_db(
        '''INSERT INTO ASSESSMENT (name, assessment_type, weight, marks, earned_marks, student_id, course_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (data['name'], data['assessment_type'], data['weight'], data['marks'],
         data.get('earned_marks'), data['student_id'], data['course_id'])
    )
    return jsonify({"success": True, "assessment_id": assessment_id})


@app.route('/update-assessment/<int:assessment_id>', methods=['POST', 'PUT'])
def update_assessment(assessment_id):
    """Update assessment details"""
    data = request.json

    execute_db(
        '''UPDATE ASSESSMENT 
           SET name = ?, assessment_type = ?, weight = ?, marks = ?, earned_marks = ?
           WHERE assessment_id = ?''',
        (data['name'], data['assessment_type'], data['weight'],
         data['marks'], data.get('earned_marks'), assessment_id)
    )
    return jsonify({"success": True})


@app.route('/delete-assessment/<int:assessment_id>', methods=['DELETE'])
def delete_assessment(assessment_id):
    """Delete an assessment"""
    execute_db('DELETE FROM ASSESSMENT WHERE assessment_id = ?',
               (assessment_id,))
    return jsonify({"success": True})

# ============ GPA CALCULATION ROUTES ============


@app.route('/calculate-gpa/<int:student_id>', methods=['GET'])
def calculate_gpa(student_id):
    """Calculate semester and cumulative GPA"""

    # Get all courses for student
    courses = query_db(
        'SELECT * FROM COURSE WHERE student_id = ?',
        (student_id,)
    )

    if not courses:
        return jsonify({"semester_gpa": 0.0, "cumulative_gpa": 0.0})

    total_grade_points = 0
    total_credits = 0
    course_grades = []

    for course in courses:
        # Get assessments for this course
        assessments = query_db(
            'SELECT * FROM ASSESSMENT WHERE course_id = ?',
            (course['course_id'],)
        )

        if not assessments:
            continue

        # Calculate course grade (weighted average)
        course_grade = 0
        total_weight = 0

        for assessment in assessments:
            if assessment['earned_marks'] is not None:
                percentage = (
                    assessment['earned_marks'] / assessment['marks']) * 100
                course_grade += (percentage * assessment['weight'] / 100)
                total_weight += assessment['weight']

        # Only calculate if we have complete assessments
        if total_weight > 0:
            # Adjust for partial completion
            course_grade = (course_grade / total_weight) * \
                100 if total_weight < 100 else course_grade

            # Convert percentage to GPA
            gpa_value = query_db(
                'SELECT gpa_value FROM GRADINGSCALE WHERE ? BETWEEN min_score AND max_score',
                (course_grade,),
                one=True
            )

            if gpa_value:
                grade_points = gpa_value['gpa_value'] * course['credit_hours']
                total_grade_points += grade_points
                total_credits += course['credit_hours']

                course_grades.append({
                    'course_code': course['course_code'],
                    'grade': round(course_grade, 2),
                    'gpa': gpa_value['gpa_value']
                })

    cumulative_gpa = total_grade_points / total_credits if total_credits > 0 else 0.0

    return jsonify({
        "semester_gpa": round(cumulative_gpa, 2),
        "cumulative_gpa": round(cumulative_gpa, 2),
        "course_grades": course_grades
    })

# ============ EXTERNAL API ROUTE ============


@app.route('/campus-weather', methods=['GET'])
def get_campus_weather():
    """Get weather for KPU Richmond campus"""
    try:
        # Richmond, BC coordinates
        response = requests.get(
            'https://api.open-meteo.com/v1/forecast?latitude=49.17&longitude=-123.14&current_weather=true'
        )
        weather = response.json()

        return jsonify({
            "temperature": weather['current_weather']['temperature'],
            "windspeed": weather['current_weather']['windspeed'],
            "time": weather['current_weather']['time']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============ ADMIN ROUTES ============


@app.route('/admin/students', methods=['GET'])
def get_all_students():
    """Get all students (admin only)"""
    students = query_db(
        "SELECT user_id, firstname, lastname, email FROM USER WHERE user_type = 'Student'"
    )
    return jsonify([dict(student) for student in students])


@app.route('/admin/delete-student/<int:student_id>', methods=['DELETE'])
def admin_delete_student(student_id):
    """Delete a student and all related data (assessments, courses)"""
    try:
        # Delete assessments belonging to the student's courses or owned by student
        execute_db('DELETE FROM ASSESSMENT WHERE student_id = ?', (student_id,))

        # Delete assessments that belong to courses owned by the student
        execute_db(
            'DELETE FROM ASSESSMENT WHERE course_id IN (SELECT course_id FROM COURSE WHERE student_id = ?)',
            (student_id,)
        )

        # Delete courses for the student
        execute_db('DELETE FROM COURSE WHERE student_id = ?', (student_id,))

        # Finally delete the user
        execute_db('DELETE FROM USER WHERE user_id = ?', (student_id,))

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/admin/student/<int:student_id>/gpa', methods=['GET'])
def get_student_gpa(student_id):
    """Get GPA for specific student (admin view)"""
    return calculate_gpa(student_id)


# ============================================================
# NEW ENDPOINTS - Student Profile & Historical Performance
# ============================================================

# ============ STUDENT PROFILE ENDPOINTS ============


@app.route('/api/students/<int:user_id>/profile', methods=['GET'])
def get_student_profile(user_id):
    """Get student profile information"""
    try:
        # Try to get all columns including new profile fields
        user = query_db(
            '''SELECT user_id, firstname, lastname, email, user_type,
                      student_id, major, level
               FROM USER WHERE user_id = ?''',
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
            "student_id": user['student_id'] or "",
            "major": user['major'] or "",
            "level": user['level'] or ""
        })
    except sqlite3.OperationalError:
        # Columns don't exist yet - return basic info
        user = query_db(
            'SELECT user_id, firstname, lastname, email, user_type FROM USER WHERE user_id = ?',
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
                "level": "",
                "note": "Profile fields not available - run database migration"
            })
        return jsonify({"success": False, "error": "User not found"}), 404


@app.route('/api/students/<int:user_id>/profile', methods=['PUT', 'POST'])
def update_student_profile(user_id):
    """Update student profile"""
    data = request.json

    try:
        execute_db(
            '''UPDATE USER 
               SET student_id = ?, major = ?, level = ?
               WHERE user_id = ?''',
            (data.get('student_id', ''), data.get('major', ''),
             data.get('level', ''), user_id)
        )
        return jsonify({"success": True, "message": "Profile updated successfully"})
    except sqlite3.OperationalError as e:
        if "no such column" in str(e):
            return jsonify({
                "success": False,
                "error": "Database needs migration. Profile columns not found."
            }), 500
        return jsonify({"success": False, "error": str(e)}), 500


# ============ HISTORICAL PERFORMANCE (Professor's Requirement) ============


@app.route('/api/students/<int:student_id>/historical-performance', methods=['GET'])
def get_historical_performance(student_id):
    """
    Get aggregated historical data for trend-based predictions.

    This supports the professor's requirement:
    "Student's course-performance calculation must now be based on 
    their historical overall performance"
    """
    try:
        # Get all assessments with grades for this student
        assessments = query_db(
            '''SELECT a.assessment_type, a.earned_marks, a.marks, c.semester
               FROM ASSESSMENT a
               JOIN COURSE c ON a.course_id = c.course_id
               WHERE a.student_id = ? AND a.earned_marks IS NOT NULL''',
            (student_id,)
        )

        if not assessments:
            # Return default values if no historical data
            return jsonify({
                "student_id": student_id,
                "data_quality": {
                    "total_assessments": 0,
                    "confidence_score": 0,
                    "message": "No historical data available"
                },
                "component_averages": {
                    "Assignment": 80.0,
                    "Quiz": 80.0,
                    "Midterm": 75.0,
                    "Final": 75.0,
                    "Project": 80.0
                },
                "overall_trend_factor": 1.0,
                "component_trend_factors": {}
            })

        # Calculate component averages
        component_data = {}
        semester_data = {}

        for a in assessments:
            ass_type = a['assessment_type']
            pct = (a['earned_marks'] / a['marks']) * \
                100 if a['marks'] > 0 else 0
            semester = a['semester']

            # Group by assessment type
            if ass_type not in component_data:
                component_data[ass_type] = []
            component_data[ass_type].append(pct)

            # Group by semester for trend calculation
            if semester not in semester_data:
                semester_data[semester] = []
            semester_data[semester].append(pct)

        # Calculate averages per component
        component_averages = {}
        for comp_type, scores in component_data.items():
            component_averages[comp_type] = round(sum(scores) / len(scores), 2)

        # Calculate trend factors per component
        component_trend_factors = {}
        for comp_type, scores in component_data.items():
            if len(scores) >= 2:
                mid = len(scores) // 2
                first_half = sum(scores[:mid]) / mid if mid > 0 else scores[0]
                second_half = sum(scores[mid:]) / (len(scores) - mid)
                trend = second_half / first_half if first_half > 0 else 1.0
                # Clamp trend to reasonable bounds (0.8 to 1.2)
                component_trend_factors[comp_type] = round(
                    min(max(trend, 0.8), 1.2), 3)
            else:
                component_trend_factors[comp_type] = 1.0

        # Calculate overall trend from semester averages
        overall_trend = 1.0
        if len(semester_data) >= 2:
            sem_avgs = [sum(s)/len(s) for s in semester_data.values()]
            mid = len(sem_avgs) // 2
            if mid > 0:
                old_avg = sum(sem_avgs[:mid]) / mid
                new_avg = sum(sem_avgs[mid:]) / (len(sem_avgs) - mid)
                if old_avg > 0:
                    overall_trend = round(
                        min(max(new_avg / old_avg, 0.8), 1.2), 3)

        # Calculate confidence score (more data = higher confidence)
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
        # Return fallback data on error
        return jsonify({
            "success": False,
            "error": str(e),
            "component_averages": {
                "Assignment": 80.0, "Quiz": 80.0,
                "Midterm": 75.0, "Final": 75.0, "Project": 80.0
            },
            "overall_trend_factor": 1.0
        }), 500


@app.route('/api/students/<int:student_id>/semester-timeline', methods=['GET'])
def get_semester_timeline(student_id):
    """Get semester-by-semester performance for graphs"""
    try:
        assessments = query_db(
            '''SELECT a.assessment_type, a.earned_marks, a.marks, c.semester
               FROM ASSESSMENT a
               JOIN COURSE c ON a.course_id = c.course_id
               WHERE a.student_id = ? AND a.earned_marks IS NOT NULL
               ORDER BY c.semester''',
            (student_id,)
        )

        if not assessments:
            return jsonify({"timeline": []})

        # Group by semester
        semester_data = {}
        for a in assessments:
            sem = a['semester']
            pct = (a['earned_marks'] / a['marks']) * \
                100 if a['marks'] > 0 else 0
            if sem not in semester_data:
                semester_data[sem] = {'by_type': {}, 'all': []}

            t = a['assessment_type']
            if t not in semester_data[sem]['by_type']:
                semester_data[sem]['by_type'][t] = []
            semester_data[sem]['by_type'][t].append(pct)
            semester_data[sem]['all'].append(pct)

        # Build timeline
        timeline = []
        for sem in sorted(semester_data.keys()):
            d = semester_data[sem]
            avgs = {t: round(sum(s)/len(s), 2)
                    for t, s in d['by_type'].items()}
            timeline.append({
                "semester": sem,
                "assessment_averages": avgs,
                "overall_average": round(sum(d['all'])/len(d['all']), 2)
            })

        return jsonify({"timeline": timeline})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============ GRADE PREDICTION (Professor's Trend Example) ============


@app.route('/api/students/<int:student_id>/predict-grade', methods=['POST'])
def predict_grade(student_id):
    """
    Predict grades based on historical trends.

    Implements the professor's requirement:
    "Consider trend of previous grades and assume that student will get 
    increasing grades and predict future grades accordingly."

    Example: quiz1=50, quiz2=60 → midterm=80, final=96 (not 88 each)
    """
    data = request.json
    target = data.get('target_grade', 75)
    completed = data.get('completed_assessments', [])
    pending = data.get('pending_assessments', [])

    if not pending:
        return jsonify({"success": False, "error": "No pending assessments"}), 400

    # Get historical trend data
    try:
        hist_response = get_historical_performance(student_id)
        hist_data = hist_response.get_json() if hasattr(
            hist_response, 'get_json') else {}
        trend = hist_data.get('overall_trend_factor', 1.0)
        component_trends = hist_data.get('component_trend_factors', {})
    except:
        trend = 1.0
        component_trends = {}

    # Calculate what's already earned
    earned = sum((a.get('score', 0) / 100) * a.get('weight', 0)
                 for a in completed)
    pending_weight = sum(a.get('weight', 0) for a in pending)

    # What we need from remaining assessments
    needed = target - earned
    base_score = (needed / pending_weight) * 100 if pending_weight > 0 else 0

    # Apply progressive prediction (earlier = lower score, later = higher score)
    # This creates the effect: quiz1=50, quiz2=60 → midterm=80, final=96
    predictions = []
    n = len(pending)

    for i, a in enumerate(pending):
        ass_type = a.get('type', 'Unknown')
        weight = a.get('weight', 0)

        # Get type-specific trend if available
        type_trend = component_trends.get(ass_type, trend)

        # Position factor creates progression: 0.8 → 1.2 (earlier lower, later higher)
        pos_factor = 0.8 + (0.4 * (i / max(n - 1, 1))) if n > 1 else 1.0

        # Calculate predicted score
        predicted = base_score * pos_factor * type_trend
        predicted = min(100, max(0, predicted))  # Clamp to 0-100

        predictions.append({
            "type": ass_type,
            "weight": weight,
            "predicted_score": round(predicted, 1),
            "position_factor": round(pos_factor, 3),
            "type_trend": round(type_trend, 3)
        })

    # Calculate if predictions meet target
    predicted_total = earned + \
        sum((p['predicted_score'] / 100) * p['weight'] for p in predictions)

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


# ============ START SERVER ============


if __name__ == '__main__':
    print("=" * 50)
    print("Academic Tracker Backend Server")
    print("=" * 50)
    print("Server running at: http://localhost:5000")
    print("Database: gpa_calculator.db")
    print("=" * 50)
    print("\nAvailable endpoints:")
    print("  POST   /login")
    print("  POST   /register")
    print("  GET    /courses/<student_id>")
    print("  POST   /add-course")
    print("  POST   /update-course/<course_id>")
    print("  GET    /calculate-gpa/<student_id>")
    print("  GET    /campus-weather")
    print("  GET    /api/students/<user_id>/profile")
    print("  PUT    /api/students/<user_id>/profile")
    print("  GET    /api/students/<student_id>/historical-performance")
    print("  GET    /api/students/<student_id>/semester-timeline")
    print("  POST   /api/students/<student_id>/predict-grade")
    print("=" * 50)
    app.run(debug=False, port=5000, use_reloader=False)
