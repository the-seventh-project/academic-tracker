# GPA Calculation Service
# Pure business logic, no HTTP dependencies
from backend.database import query_db


def get_grading_scale() -> list:
    """
    Get the full grading scale from the database.
    """
    scales = query_db('SELECT * FROM "GRADINGSCALE" ORDER BY min_score DESC')
    return [dict(row) for row in scales]


def calculate_student_gpa(student_id: int) -> dict:
    """
    Calculate GPA for a student.
    
    Returns:
        dict with semester_gpa, cumulative_gpa, and course_grades
    """
    courses = query_db(
        'SELECT * FROM "COURSE" WHERE student_id = ?',
        (student_id,)
    )

    if not courses:
        return {"semester_gpa": 0.0, "cumulative_gpa": 0.0, "course_grades": []}

    total_grade_points = 0
    total_credits = 0
    course_grades = []

    for course in courses:
        assessments = query_db(
            'SELECT * FROM "ASSESSMENT" WHERE course_id = ?',
            (course['course_id'],)
        )

        if not assessments:
            continue

        course_grade = 0
        total_weight = 0

        for assessment in assessments:
            if assessment['earned_marks'] is not None:
                percentage = (assessment['earned_marks'] / assessment['marks']) * 100
                course_grade += (percentage * assessment['weight'] / 100)
                total_weight += assessment['weight']

        if total_weight > 0:
            # Adjust for partial completion
            course_grade = (course_grade / total_weight) * 100 if total_weight < 100 else course_grade

            # Convert percentage to GPA using grading scale
            gpa_value = query_db(
                'SELECT gpa_value FROM "GRADINGSCALE" WHERE ? BETWEEN min_score AND max_score',
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

    return {
        "semester_gpa": round(cumulative_gpa, 2), # Legacy support
        "cumulative_gpa": round(cumulative_gpa, 2),
        "total_credits": total_credits,
        "course_grades": course_grades
    }


def calculate_gpa_breakdown(student_id: int) -> dict:
    """
    Calculate GPA breakdown by semester.
    """
    courses = query_db(
        'SELECT * FROM "COURSE" WHERE student_id = ? ORDER BY semester',
        (student_id,)
    )

    if not courses:
        return {"semesters": [], "cumulative_gpa": 0.0}

    semester_groups = {}
    for course in courses:
        sem = course['semester'] or 'Unknown'
        if sem not in semester_groups:
            semester_groups[sem] = []
        semester_groups[sem].append(course)

    semesters_result = []
    total_points_global = 0
    total_credits_global = 0

    for sem, sem_courses in semester_groups.items():
        sem_points = 0
        sem_credits = 0
        course_details = []

        for course in sem_courses:
            assessments = query_db(
                'SELECT * FROM "ASSESSMENT" WHERE course_id = ?',
                (course['course_id'],)
            )

            if not assessments:
                course_details.append({
                    "course_code": course['course_code'],
                    "credits": course['credit_hours'],
                    "grade": 0,
                    "gpa": 0
                })
                continue
            
            # Calculate course grade
            course_grade = 0
            total_weight = 0
            for assessment in assessments:
                if assessment['earned_marks'] is not None:
                    percentage = (assessment['earned_marks'] / assessment['marks']) * 100
                    course_grade += (percentage * assessment['weight'] / 100)
                    total_weight += assessment['weight']
            
            if total_weight > 0:
                 if total_weight < 100:
                     course_grade = (course_grade / total_weight) * 100
            
            # Get GPA
            gpa_entry = query_db(
                'SELECT gpa_value FROM "GRADINGSCALE" WHERE ? BETWEEN min_score AND max_score',
                (course_grade,), one=True
            )
            gpa_val = gpa_entry['gpa_value'] if gpa_entry else 0.0
            
            sem_points += gpa_val * course['credit_hours']
            sem_credits += course['credit_hours']
            course_details.append({
                "course_code": course['course_code'],
                "credits": course['credit_hours'],
                "grade": round(course_grade, 2),
                "gpa": gpa_val
            })
        
        sem_gpa = sem_points / sem_credits if sem_credits > 0 else 0.0
        semesters_result.append({
            "semester": sem,
            "gpa": round(sem_gpa, 2),
            "credits": sem_credits,
            "courses": course_details
        })

        total_points_global += sem_points
        total_credits_global += sem_credits

    cumulative = total_points_global / total_credits_global if total_credits_global > 0 else 0.0

    return {
        "semesters": semesters_result,
        "cumulative_gpa": round(cumulative, 2),
        "total_credits": total_credits_global
    }


def get_gpa_value_for_percentage(percentage: float) -> float:
    """Convert a percentage grade to GPA value using the grading scale."""
    result = query_db(
        'SELECT gpa_value FROM "GRADINGSCALE" WHERE ? BETWEEN min_score AND max_score',
        (percentage,),
        one=True
    )
    return result['gpa_value'] if result else 0.0
