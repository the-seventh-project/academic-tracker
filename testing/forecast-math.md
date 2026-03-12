# Forecast Math — How It Works

This document explains in detail how the two forecast calculators work, step by step, using the actual code logic.

---

## 1. Course Grade Forecast (`grade-forecast` page)

**File:** `backend/services/forecast_service.py` → `calculate_course_grade_forecast()`

### What it does
Given a list of assessments for one course, it answers:
- **What is my current standing?**
- **What mark do I need on the remaining assessments to reach my target grade?**

### Input
Each assessment has:
| Field    | Example | Meaning |
|----------|---------|---------|
| `name`   | "Midterm" | Label |
| `weight` | 30      | % of final grade this assessment is worth |
| `mark`   | 75      | Your score as a % (optional — if blank, it's unknown/future) |

> **Rule:** All weights across all assessments must add up to exactly 100%.

---

### Step 1 — Separate known vs unknown assessments

```
Known   = assessments where you have a mark already
Unknown = assessments you haven't done yet (or left blank)
```

Example:
```
Assignment  weight=20  mark=80   → Known
Midterm     weight=30  mark=72   → Known
Final       weight=40  mark=?    → Unknown
Lab         weight=10  mark=90   → Known
```

---

### Step 2 — Calculate earned weighted points

For each **known** assessment:
```
weighted_contribution = mark × (weight / 100)
```

Sum them all up:
```
earned_weighted = Σ (mark_i × weight_i / 100)   for all known assessments
```

Using the example:
```
Assignment:  80  × (20/100) = 16.0
Midterm:     72  × (30/100) = 21.6
Lab:         90  × (10/100) = 9.0
─────────────────────────────────
earned_weighted = 46.6  (out of a possible 60, since known_weight = 60)
```

This 46.6 represents actual grade points you've locked in so far.

---

### Step 3 — Calculate how many points you still need

```
remaining_needed_points = target_grade - earned_weighted
```

Using target = 80:
```
remaining_needed_points = 80 - 46.6 = 33.4
```

---

### Step 4 — Calculate required average on unknowns

`unknown_weight` = sum of weights for all unknown assessments = 40 (the Final).

```
required_percent_on_unknowns = (remaining_needed_points × 100) / unknown_weight
```

```
required_percent_on_unknowns = (33.4 × 100) / 40 = 83.5%
```

**Interpretation:** You need to score **83.5%** on your Final exam to reach an 80% total in this course.

---

### Step 5 — Determine status

| Condition                     | Status      | Meaning |
|------------------------------|-------------|---------|
| `required_percent > 100`     | Impossible  | Even scoring 100% won't reach the target |
| `required_percent <= 0`      | Satisfied   | You've already passed the target with known marks |
| `0 < required_percent <= 100`| Possible    | Achievable, here's what you need |

---

### Edge case: No unknowns

If all assessments are filled in (nothing is blank):
```
projected_grade = earned_weighted
```
- If `projected_grade >= target` → **Satisfied**
- If `projected_grade < target` → **Impossible** (nothing left to change)

---

## 2. GPA Forecast (`gpa-forecast` page)

**File:** `backend/services/forecast_service.py` → `calculate_gpa_forecast()`

### What it does
Given your current cumulative GPA and a list of future courses (with hypothetical grades), it answers:
- **What will my cumulative GPA be after these courses?**
- **What average GPA do I need on unknown future courses to hit a target GPA?**

---

### Key concept: Grade Points

GPA is calculated using **grade points**, not raw marks.

```
grade_points_for_one_course = GPA_value × credit_hours
```

Cumulative GPA formula:
```
Cumulative GPA = Total Grade Points / Total Credit Hours
```

---

### KPU Grading Scale (used for all lookups)

| Grade | Percentage    | GPA Value |
|-------|--------------|-----------|
| A+    | 90 – 100     | 4.00      |
| A     | 85 – 89.99   | 4.00      |
| A-    | 80 – 84.99   | 3.70      |
| B+    | 77 – 79.99   | 3.30      |
| B     | 73 – 76.99   | 3.00      |
| B-    | 70 – 72.99   | 2.70      |
| C+    | 67 – 69.99   | 2.30      |
| C     | 63 – 66.99   | 2.00      |
| C-    | 60 – 62.99   | 1.70      |
| D     | 50 – 59.99   | 1.00      |
| F     | 0  – 49.99   | 0.00      |

**Important:** This is a step function. Scoring 89.9% and 85.0% both give GPA 4.00. There are no in-between values.

---

### Step 1 — Load current standing

```
current_credits = 30      (total credits completed)
current_gpa     = 3.20
current_points  = current_credits × current_gpa = 30 × 3.20 = 96.0
```

`current_points` is the total accumulated grade points your transcript already holds.

---

### Step 2 — Process each future course

For each hypothetical course:

**If you provided a hypothetical grade percentage:**
```
gpa_value    = lookup GPA from grading scale using the percentage
future_points += gpa_value × course_credits
```

Example: You predict 82% in MATH1234 (3 credits)
```
82% → A-  → GPA 3.70
future_points += 3.70 × 3 = 11.1
```

**If you left it blank (unknown future course):**
```
unknown_credits += course_credits
(no future_points added yet)
```

---

### Step 3 — Calculate projected cumulative GPA

```
total_combined_credits = current_credits + future_credits
projected_cumulative   = (current_points + future_points) / total_combined_credits
```

Example (continuing from above, adding one known course INFO2345 at 75% = B = 3.0, 3 credits):
```
future_points         = 11.1 + (3.0 × 3) = 11.1 + 9.0 = 20.1
future_credits        = 3 + 3 = 6
total_combined        = 30 + 6 = 36

projected_cumulative  = (96.0 + 20.1) / 36 = 116.1 / 36 = 3.225 → rounds to 3.23
```

---

### Step 4 — Target Analysis (if you set a target GPA)

Suppose you want to reach a 3.40 cumulative GPA.

**Calculate total points needed to hit the target:**
```
target_points_total = target_gpa × total_combined_credits
                    = 3.40 × 36 = 122.4
```

**How many more points do you still need from unknowns?**
```
remaining_needed = target_points_total - current_points - future_points
                 = 122.4 - 96.0 - 20.1 = 6.3
```

**If there are unknown courses (credits you haven't assigned a grade to):**
```
required_avg_gpa_for_unknowns = remaining_needed / unknown_credits
```

Suppose there are 6 unknown credits:
```
required_avg_gpa = 6.3 / 6 = 1.05
```

**Rough estimated percentage equivalent (the code uses a simple approximation):**
```
estimated_percent = (required_avg_gpa / 4.0) × 100
                  = (1.05 / 4.0) × 100 = 26.25%
```

> ⚠️ **Note:** This percentage estimate is a rough linear approximation. The actual GPA scale is a step function, so the real minimum percentage will differ slightly. The code notes this limitation. For example, a required GPA of 1.05 maps to roughly 50–60% on the actual scale.

---

### Step 5 — Feasibility check

| Condition                         | Status      |
|----------------------------------|-------------|
| `required_avg_gpa > 4.33`        | Impossible  |
| `required_avg_gpa <= 0`          | Already Satisfied |
| `0 < required_avg_gpa <= 4.33`   | Possible    |

---

## 3. How the Actual GPA Calculation Works (not forecast — current GPA)

**File:** `backend/services/gpa_service.py` → `calculate_student_gpa()`

This is the base GPA that feeds into the forecast as `current_gpa`.

### For each course:
1. Fetch all assessments for that course
2. For each assessment with an earned mark:
   ```
   percentage_contribution = (earned_marks / total_marks) × 100 × (weight / 100)
   ```
3. Sum contributions → `course_grade` (only for known/graded assessments)
4. If assessments are partially complete (total weight < 100%), normalize:
   ```
   course_grade = (course_grade / total_weight) × 100
   ```
   > This means if you've only done 60% of the graded work, the grade is scaled to what you'd get if the rest was proportional.
5. Look up the course_grade in the GRADINGSCALE table to get `gpa_value`
6. `grade_points = gpa_value × credit_hours`

### Final GPA:
```
cumulative_gpa = Σ grade_points / Σ credit_hours
```
Only courses with at least one graded assessment are counted.

---

## Summary Table

| Calculator        | Input                          | Key Formula |
|------------------|-------------------------------|-------------|
| Course Grade      | Assessment weights + marks     | `required% = (target - earned_weighted) × 100 / unknown_weight` |
| GPA Forecast      | Hypothetical course % + target GPA | `required_gpa = (target × total_credits - current_points - future_points) / unknown_credits` |
| Current GPA       | Actual earned/total marks      | `gpa = Σ(gpa_value × credits) / Σ credits` |
