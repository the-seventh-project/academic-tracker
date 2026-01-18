from ..services.gpa_service import get_gpa_value_for_percentage

def calculate_gpa_forecast(current_summary: dict, hypothetical_courses: list, target_gpa: float = None) -> dict:
    """
    Calculate forecasted GPA based on current performance and hypothetical courses.
    """
    current_credits = float(current_summary.get('total_credits', 0))
    current_gpa = float(current_summary.get('cumulative_gpa', 0))
    current_points = current_credits * current_gpa

    future_credits = 0
    future_points = 0
    unknown_credits = 0
    hypothetical_results = []

    for course in hypothetical_courses:
        credits = float(course.get('credits', 0))
        hypo_grade = course.get('hypothetical') # Percent
        
        # If hypothetical grade is provided
        if hypo_grade is not None:
            gpa = get_gpa_value_for_percentage(float(hypo_grade))
            future_points += gpa * credits
            course_result = {
                "course_code": course.get('code'),
                "credits": credits,
                "hypothetical": float(hypo_grade),
                "gpa": gpa,
                "minimum_required": "-" 
            }
        else:
            # Unknown course
            unknown_credits += credits
            course_result = {
                "course_code": course.get('code'),
                "credits": credits,
                "hypothetical": None,
                "gpa": None,
                "minimum_required": "TBD"
            }
        
        future_credits += credits
        hypothetical_results.append(course_result)

    total_future_credits = future_credits
    total_combined_credits = current_credits + total_future_credits

    # Calculate Projected Cumulative (if no unknowns)
    projected_cumulative = 0.0
    if total_combined_credits > 0:
        # Assuming unknowns are 0 for basic projection if not targeted
        projected_cumulative = (current_points + future_points) / total_combined_credits

    result = {
        "current": {
            "gpa": current_gpa,
            "credits": current_credits
        },
        "projected": {
            "cumulative_gpa": round(projected_cumulative, 2),
            "total_credits": total_combined_credits
        },
        "courses": hypothetical_results,
        "target_analysis": None
    }

    # Target Analysis
    if target_gpa is not None:
        target_points_total = target_gpa * total_combined_credits
        remaining_needed = target_points_total - current_points - future_points

        if unknown_credits <= 0:
            status = "Satisfied" if remaining_needed <= 0 else "Impossible"
            result["target_analysis"] = {
                "status": status,
                "target_gpa": target_gpa
            }
            # Update minimums
            for c in hypothetical_results:
                if c['hypothetical'] is None:
                    c['minimum_required'] = "Impossible" if status == "Impossible" else "0.00"

        else:
            # Distribute remaining points across unknowns
            # remaining_needed is GPA_POINTS. Need to convert to Average GPA then to Percent.
            # Avg GPA needed for unknowns = remaining_needed / unknown_credits
            
            required_avg_gpa = remaining_needed / unknown_credits
            
            # This is tricky because GPA is step-function of Percent.
            # But the requirement is usually simplified to "Average Points".
            # Mapping Avg Points -> Percent is approximate or requires solving.
            # Using simple Linear approximation: 4.0 = 100%, 0.0 = 0% is too simple?
            # Creating a reverse lookup or linear scale 0-4 -> 0-100?
            # KPU Scale: 4.33=90-100, 4.0=85-89, 3.67=80-84 ... 
            # Let's use a simpler approximation: Percent = (GPA / 4.0) * 100 ?
            # Or better, scan the grading scale to find the minimum percent that yields >= required_avg_gpa.
            
            # Since we can't easily reverse the step function perfectly for an average,
            # we will provide the "Average GPA Required" for the unknowns.
            # And an ESTIMATED percent.
            
            estimated_percent = (required_avg_gpa / 4.0) * 100 # Rough estimate
            # Clamp
            estimated_percent = max(0, min(100, estimated_percent))
            
            # Check feasibility
            status = "Possible"
            if required_avg_gpa > 4.33:
               status = "Impossible"
               estimated_percent = 100
            elif required_avg_gpa <= 0:
               status = "Satisfied"
               estimated_percent = 0

            result["target_analysis"] = {
                "status": status,
                "target_gpa": target_gpa,
                "required_avg_gpa_for_unknowns": round(required_avg_gpa, 2),
                "estimated_percent_required": round(estimated_percent, 2)
            }
            
            for c in hypothetical_results:
                if c['hypothetical'] is None:
                    c['minimum_required'] = "Impossible" if status == "Impossible" else f"{estimated_percent:.2f}"

    return result

def calculate_course_grade_forecast(assessments: list, target_grade: float = None) -> dict:
    """
    Calculate projected course grade.
    assessments: list of dict {name, weight, mark(optional/hypothetical)}
    """
    known_weight = 0
    earned_weighted = 0
    unknown_weight = 0
    results = []

    for a in assessments:
        weight = float(a.get('weight', 0))
        mark = a.get('mark')
        
        if mark is not None:
             # Known/Hypothetical
             mark = float(mark)
             earned_weighted += (mark * weight / 100)
             known_weight += weight
             results.append({
                 "name": a.get('name'),
                 "weight": weight,
                 "mark": mark,
                 "minimum_required": "-"
             })
        else:
            unknown_weight += weight
            results.append({
                 "name": a.get('name'),
                 "weight": weight,
                 "mark": None,
                 "minimum_required": "TBD"
            })

    current_total_mark = earned_weighted # So far (out of known_weight)
    
    # Projection if unknowns were 0? or Max?
    # Spec says "Minimum Required".
    
    analysis = None
    if target_grade is not None:
        needed_total = float(target_grade)
        remaining_needed_points = needed_total - earned_weighted
        
        if unknown_weight <= 0:
            status = "Satisfied" if remaining_needed_points <= 0 else "Impossible"
            min_req = "0.00" if status == "Satisfied" else "Impossible"
            
            for r in results:
                if r['mark'] is None: r['minimum_required'] = min_req
                
            analysis = {"status": status, "projected_grade": earned_weighted}
        else:
            # Required average on unknowns
            # remaining points = (req_pct * unknown_weight / 100)
            # req_pct = (remaining * 100) / unknown_weight
            
            req_pct = (remaining_needed_points * 100) / unknown_weight
            
            status = "Possible"
            if req_pct > 100:
                status = "Impossible"
            elif req_pct <= 0:
                status = "Satisfied"
                req_pct = 0
                
            req_pct = max(0, min(100, req_pct)) # Cap for display
            
            for r in results:
                if r['mark'] is None:
                    r['minimum_required'] = f"{req_pct:.2f}"
            
            analysis = {
                "status": status,
                "projected_grade": earned_weighted + (req_pct * unknown_weight / 100)
            }

    return {
        "assessments": results,
        "summary": {
            "total_weight": known_weight + unknown_weight,
            "earned_weighted": round(earned_weighted, 2),
            "unknown_weight": unknown_weight
        },
        "target_analysis": analysis
    }
