# Full-Stack Data Flow Analysis

**Date:** March 11, 2026
**Branch:** `dev` (commit `a701444`)
**Scope:** Complete audit of database → backend → API → frontend → UI rendering

---

## Executive Summary

The application has **11 confirmed bugs** and **3 architectural concerns**. The root pattern is a set of **request/response mismatches** between frontend and backend, combined with **raw `fetch()` calls that bypass the API wrapper's error handling**, and **missing payload fields** in service calls.

The backend endpoints themselves are functionally correct — data is inserted/updated/queried properly. The breakdowns occur in:
1. How the frontend **sends** data (wrong field names)
2. How the frontend **receives** data (raw fetch without error safety)
3. How services **omit** required fields from API payloads

---

## Architecture Overview

```
Frontend (Vanilla JS + Bootstrap 5.3 + Chart.js)
    ├── core/config.js         → API_URL = Render
    ├── core/api.js            → window.API.get/post/put/delete wrapper
    ├── core/auth.js           → Auth utility (localStorage)
    ├── core/utils.js          → GpaUtils + Notify toast system
    ├── services/
    │   ├── gpaService.js      → getBreakdown(), getSummary(), getGradingScale()
    │   ├── forecastService.js → predictGPA(), predictCourseGrade()
    │   └── configService.js   → getAssessmentTypes()
    ├── components/
    │   ├── GpaChart.js        → Profile page chart (standalone)
    │   └── AssessmentTable.js → Grade forecast table component
    └── pages/                 → Page controllers (student.js, add.js, detail.js, etc.)

Backend (Flask on Render free tier)
    ├── app.py                 → Flask app, CORS, register blueprints
    ├── config.py              → DATABASE_URL from env
    ├── database.py            → query_db(), execute_db() (SQLite/PostgreSQL)
    ├── create_database.py     → Schema + seed data + migrations
    ├── routes/
    │   ├── auth.py            → /api/auth/login, /register, /reset-password
    │   ├── courses.py         → /api/courses, /add-course, /update-course, /delete-course
    │   ├── assessments.py     → /api/assessments, /add-assessment, /update-assessment, /delete-assessment
    │   ├── gpa.py             → /api/calculate-gpa, /api/gpa/<id>/breakdown, /api/config/grading-scale
    │   ├── students.py        → /api/students/<id>/profile (GET/PUT)
    │   ├── admin.py           → /api/admin/students, /delete-student, /student/<id>/gpa
    │   ├── forecast.py        → /api/forecast/gpa, /api/forecast/course-grade
    │   ├── config.py          → /api/config/assessment-types, /api/config/semesters
    │   └── external.py        → /campus-weather
    └── services/
        ├── gpa_service.py     → calculate_student_gpa(), calculate_gpa_breakdown()
        ├── forecast_service.py → calculate_gpa_forecast(), calculate_course_grade_forecast()
        └── config_service.py  → get_assessment_types(), get_semesters()

Database (Neon PostgreSQL / SQLite local)
    Tables: USER, COURSE, ASSESSMENT, GPAREPORT, WHATIFSCENARIO, ASSESSMENT_TYPE, GRADINGSCALE
```

---

## Bug Inventory

### BUG-01: `student.js` `loadGPA()` uses raw `fetch()` — bypasses API wrapper

**Severity:** HIGH
**Files:** `frontend/js/pages/dashboard/student.js` lines 53, 60
**Impact:** GPA Trends chart, Cumulative GPA, Semester GPA, Total Credits ALL fail silently

**Problem:**
```js
// Line 53 — raw fetch, no JSON safety
const response = await fetch(`${window.API_URL}/api/calculate-gpa/${currentUser.id}`);
const data = await response.json();  // ← THROWS on Render cold-start HTML 503

// Line 60 — same problem
const coursesResponse = await fetch(`${window.API_URL}/api/courses/${currentUser.id}`);
const courses = await coursesResponse.json();  // ← THROWS on non-JSON
```

When Render is cold (free tier, 30-60s spin-up), these return HTTP 503 with an HTML body. `response.json()` throws a `SyntaxError`. The entire `loadGPA()` catches and logs to console, but **no data is rendered**: GPA shows nothing, chart is empty, credits missing.

Meanwhile, `loadCourses()` (called after) uses `window.API.get()` which now has the JSON safety guard — so the courses table may load fine while GPA data fails.

**Root cause:** These two calls were never migrated to use `window.API.get()`.

**Fix:**
```js
// Replace raw fetch with API wrapper
const data = await window.API.get(`/api/calculate-gpa/${currentUser.id}`);
const courses = await window.API.get(`/api/courses/${currentUser.id}`);
```

---

### BUG-02: `forecastService.js` sends wrong field names to `/api/forecast/gpa`

**Severity:** HIGH
**Files:** `frontend/js/services/forecastService.js` line 6, `backend/routes/forecast.py` line 20

**Problem:**
Frontend sends:
```js
{
    current_gpa: currentGPA,      // ← backend ignores
    credits_earned: currentCredits, // ← backend ignores
    courses: courses               // ← backend ignores (expects "hypothetical_courses")
}
```

Backend expects:
```python
data.get('current_summary')        # → None (frontend sent current_gpa instead)
data.get('hypothetical_courses')   # → None (frontend sent courses instead)
data.get('target_gpa')             # → None (frontend never sends this at all)
data.get('student_id')             # → None (frontend never sends this)
```

**Result:** `current_summary` falls through to `{"cumulative_gpa": 0, "total_credits": 0}`. `hypothetical` is `[]`. The API returns a valid but meaningless response with all zeros. No error is thrown because the backend gracefully defaults.

**Fix in `forecastService.js`:**
```js
async predictGPA(currentGPA, currentCredits, courses, targetGPA) {
    return window.API.post('/api/forecast/gpa', {
        current_summary: {
            cumulative_gpa: currentGPA,
            total_credits: currentCredits
        },
        hypothetical_courses: courses,
        target_gpa: targetGPA
    });
}
```

Also update `gpa-forecast.js` `runAnalysis()` to pass `targetGPA` to the service call.

---

### BUG-03: `forecastService.js` `predictCourseGrade()` never sends `target_grade`

**Severity:** MEDIUM
**Files:** `frontend/js/services/forecastService.js` line 12, `frontend/js/pages/tools/grade-forecast.js` line 59

**Problem:**
```js
// forecastService.js
async predictCourseGrade(assessments) {
    return window.API.post('/api/forecast/course-grade', {
        assessments: assessments
        // ← target_grade is MISSING
    });
}
```

In `grade-forecast.js`, `targetGrade` is parsed from the DOM input but never passed to the service:
```js
const targetGrade = parseFloat(document.getElementById('targetGrade').value);
// ... validation ...
const result = await window.forecastService.predictCourseGrade(assessments);
// targetGrade is never forwarded ↑
```

**Result:** Backend receives `target_grade = None`, so `target_analysis` is always `None`. The "minimum required" column shows `"TBD"` for all unknown assessments instead of actual calculated values.

**Fix:**
```js
// forecastService.js
async predictCourseGrade(assessments, targetGrade) {
    return window.API.post('/api/forecast/course-grade', {
        assessments: assessments,
        target_grade: targetGrade
    });
}

// grade-forecast.js
const result = await window.forecastService.predictCourseGrade(assessments, targetGrade);
```

---

### BUG-04: `forgot-password.js` sends `newPassword` but backend expects `new_password`

**Severity:** MEDIUM
**Files:** `frontend/js/pages/auth/forgot-password.js` line 13, `backend/routes/auth.py` line 73

**Problem:**
```js
// Frontend sends camelCase:
{ email: email, newPassword: newPassword }

// Backend reads snake_case:
new_password = data.get('new_password')  // → None
```

**Result:** `generate_password_hash(None)` raises a `TypeError` → backend returns HTTP 500 → frontend shows "Server Error". The password reset always fails.

**Fix in `forgot-password.js`:**
```js
{ email: email, new_password: newPassword }
```

---

### BUG-05: `register.js` checks `data.error` but backend returns `data.message`

**Severity:** LOW
**Files:** `frontend/js/pages/auth/register.js` line 23, `backend/routes/auth.py` line 65

**Problem:**
```js
// Frontend:
showError(data.error || 'Failed to register');

// Backend returns on error:
jsonify({"success": False, "message": str(e)}), 400
```

`data.error` is always `undefined`. The generic `'Failed to register'` message is shown instead of the actual error (e.g., "UNIQUE constraint failed: USER.email").

**Fix:** `showError(data.message || data.error || 'Failed to register');`

---

### BUG-06: `detail.js` `deleteAssessment()` uses raw `fetch()` — bypasses API wrapper

**Severity:** LOW
**Files:** `frontend/js/pages/courses/detail.js` line 361

**Problem:**
```js
const response = await fetch(`${window.API_URL}/api/delete-assessment/${id}`, {
    method: 'DELETE'
});
```

This raw `fetch()` call bypasses the `API.fetch()` wrapper. On Render cold-start, it will fail with the same HTML 503 problem, though the assessment will be deleted.

**Fix:**
```js
await window.API.delete(`/api/delete-assessment/${id}`);
```

---

### BUG-07: `admin.js` still uses hardcoded "Fall" semester GPA

**Severity:** LOW
**Files:** `frontend/js/pages/dashboard/admin.js` lines 35-52

**Problem:** The admin dashboard still calculates Fall semester GPA specifically:
```js
if (course.semester && course.semester.toLowerCase().includes('fall')) { ... }
```

The student dashboard was already fixed to use the most recent semester. Admin is still hardcoded.

**Fix:** Apply the same fix from `student.js` — use `calculateSemesterGPAs()` and take the last entry, or replicate the logic.

---

### BUG-08: `GpaChart.js` component uses old green/dark colors

**Severity:** LOW (Visual)
**Files:** `frontend/js/components/GpaChart.js` lines 30-37, 55-61

**Problem:**
```js
borderColor: '#2ecc71',                    // bright green
backgroundColor: 'rgba(46, 204, 113, 0.1)', // green fill
pointBackgroundColor: '#27ae60',            // darker green
// Tooltip:
backgroundColor: 'rgba(0,0,0,0.8)',        // dark tooltip
```

The rest of the app uses the monochrome palette (`#2A2E35`, `#121417`). This component is still green/dark from an older iteration. Used on the Profile page.

**Fix:** Update to match `student.js` `createGPAChart()` colors.

---

### BUG-09: `gpa_service.py` `calculate_gpa_breakdown()` counts credits for courses WITHOUT assessments

**Severity:** MEDIUM
**Files:** `backend/services/gpa_service.py` lines 122-140

**Problem:**
In `calculate_gpa_breakdown()`, when a course has no assessments (new course just added), it still enters the GPA calculation:
```python
if not assessments:
    course_details.append({...})
    continue  # ← skips grade calculation BUT...

# ... further down:
sem_points += gpa_val * course['credit_hours']  # gpa_val = 0.0
sem_credits += course['credit_hours']  # ← credits ARE counted
```

Wait — actually the `continue` skips the GPA calculation block, so `sem_points` and `sem_credits` are NOT incremented for no-assessment courses. But the `course_details` still shows `gpa: 0` which dilutes the per-semester data if used for display.

Actually re-reading: the `continue` exits the for loop iteration before `sem_points += ...`, so credits are NOT counted. This is correct behavior.

**However**, there is a subtle issue: when `total_weight > 0` but `gpa_entry` is `None` (grading scale lookup fails), `gpa_val = 0.0`. The course's credits ARE counted (`sem_credits += course['credit_hours']`), which drags GPA toward 0.

This happens when:
- A course has assessments with `total_weight > 0`
- But `course_grade` doesn't fall within any GRADINGSCALE range
- E.g., `course_grade = 100.01` (floating point) won't match `max_score = 100.00`

**Fix:** Either handle the edge case in the grading scale query (use `>=` / `<=` instead of `BETWEEN`), or skip courses where grading scale lookup fails.

---

### BUG-10: `calculate_student_gpa()` — inconsistency with `calculate_gpa_breakdown()` on no-grade handling

**Severity:** LOW
**Files:** `backend/services/gpa_service.py` lines 47-70 vs 120-155

**Problem:**
In `calculate_student_gpa()`, if `gpa_value` lookup returns `None`, the course is simply skipped (`if gpa_value:` block not entered). Credits are NOT counted.

In `calculate_gpa_breakdown()`, the same scenario results in `gpa_val = 0.0` and credits ARE counted (`sem_credits += course['credit_hours']`).

This means cumulative GPA from `/api/calculate-gpa/<id>` and from `/api/gpa/<id>/breakdown` can differ for the same student when some courses have edge-case grades.

**Fix:** Align both functions: either both skip or both include courses with no grading match.

---

### BUG-11: `database.py` `execute_db()` — PostgreSQL `lastrowid` returns OID instead of auto-increment ID

**Severity:** MEDIUM
**Files:** `backend/database.py` lines 82-90

**Problem:**
```python
last_id = cursor.lastrowid  # psycopg2 returns OID, NOT the serial ID
```

For PostgreSQL (Neon), `cursor.lastrowid` returns the OID of the last inserted row, which for modern PostgreSQL (12+) with default `oids=False` on tables returns `0`.

This means `/api/add-course` returns `{"success": true, "course_id": 0}` and `/api/auth/register` returns `{"success": true, "user_id": 0}`. The `0` doesn't cause errors because the frontend doesn't use these returned IDs for anything critical — but it's incorrect data.

**Fix:** Use `RETURNING <pk_column>` in INSERT queries and `cursor.fetchone()` to get the actual auto-increment ID.

```python
# For PostgreSQL inserts:
cursor.execute(formatted_query + ' RETURNING course_id', args)
last_id = cursor.fetchone()[0]
```

Or modify `execute_db()` to accept an optional `returning` column name.

---

## Verified Working (No Issues Found)

| Component | Status | Notes |
|-----------|--------|-------|
| `/api/auth/login` | ✅ CORRECT | Returns `{success, user}` with correct fields. Frontend handles properly. |
| `/api/courses/<id>` GET | ✅ CORRECT | Returns array of course dicts. Frontend maps correctly. |
| `/api/add-course` POST | ✅ CORRECT | Backend inserts and returns `{success: true}`. The "error" users see is BUG-01 (raw fetch on cold-start). |
| `/api/assessments/<id>` GET | ✅ CORRECT | Returns array of assessment dicts. `detail.js` renders correctly. |
| `/api/add-assessment` POST | ✅ CORRECT | Backend inserts and returns `{success: true, assessment_id}`. |
| `/api/update-assessment/<id>` | ✅ CORRECT | Accepts both POST/PUT. Returns `{success: true}`. |
| `/api/delete-course/<id>` | ✅ CORRECT | Deletes assessments first, then course. |
| `/api/delete-assessment/<id>` | ✅ CORRECT | Backend endpoint exists and works. |
| `/api/calculate-gpa/<id>` | ✅ CORRECT | Returns `{semester_gpa, cumulative_gpa, total_credits, course_grades}`. |
| `/api/gpa/<id>/breakdown` | ✅ CORRECT | Returns `{semesters, cumulative_gpa, total_credits}`. |
| `/api/config/grading-scale` | ✅ CORRECT | Returns grading scale array. |
| `/api/config/assessment-types` | ✅ CORRECT | Returns assessment types with defaults. |
| `/api/config/semesters` | ✅ CORRECT | Returns semester list. |
| `/api/students/<id>/profile` GET/PUT | ✅ CORRECT | Returns/updates profile fields. |
| `/api/update-course/<id>` | ✅ CORRECT | Accepts both POST/PUT, returns `{success: true}`. |
| CORS Configuration | ✅ CORRECT | `CORS(app, resources={r"/*": {"origins": "*"}})` — fully permissive. |
| GRADINGSCALE seed data | ✅ CORRECT | KPU scale inserted with `ON CONFLICT DO NOTHING`. |
| `api.js` JSON parse guard | ✅ FIXED | Wraps `response.json()` in try-catch. (Fixed in commit `a701444`.) |
| `student.js` GPA chart instance | ✅ FIXED | `gpaChartInstance` tracked and destroyed. (Fixed in commit `a701444`.) |
| `student.js` semester GPA | ✅ FIXED | Uses most recent semester, not hardcoded "Fall". (Fixed in commit `a701444`.) |
| `gpa-forecast.js` current term GPA | ✅ FIXED | Computed from `summary.semesters[last].gpa`. (Fixed in commit `a701444`.) |
| Notifications | ✅ FIXED | Standardized via `Notify` utility. (Fixed in commit `a701444`.) |

---

## Full Data Flow Traces

### Trace 1: Add Course → Dashboard Redirect

```
User clicks "Add Course" on add.html
  → add.js: validates form, calls window.API.post('/api/add-course', courseData)
    → api.js: fetch(Render_URL + '/api/add-course', {method:'POST', body: JSON})
      → Render: may be cold (503 HTML) or warm (200 JSON)
        
      IF WARM:
        ← 200 {"success": true, "course_id": 0}  (0 because of BUG-11, but OK)
        ← api.js: response.json() succeeds, response.ok = true, returns data
        ← add.js: data.success = true → Notify.success() → redirect to dashboard
        
      IF COLD-START (Render 503):
        ← 503 HTML page (not JSON)
        ← api.js: response.json() THROWS → caught by inner try-catch
        ← api.js: throws Error("Server returned an unexpected response (HTTP 503). If you just submitted data...")
        ← add.js: catch → Notify.error(error.message)  [User sees error]
        ← BUT Render queued the request; course IS inserted when server finishes starting

      RESULT: User sees error but course was added. This is BUG-01 class (cold-start).
      The api.js fix (commit a701444) now shows a helpful hint message.
```

### Trace 2: Student Dashboard → GPA, Chart, Credits

```
student.html loads → student.js window.onload
  → loadDashboardData()
    → loadWeather() [uses window.API.get — OK]
    → loadGPA()
      → RAW fetch(`${API_URL}/api/calculate-gpa/${id}`)     ← BUG-01
        IF 503: response.json() throws → catch logs error → NO GPA DATA RENDERED
        IF 200: data = {semester_gpa, cumulative_gpa, total_credits, course_grades}
      → RAW fetch(`${API_URL}/api/courses/${id}`)            ← BUG-01
        IF 503: response.json() throws → catch logs error → NO COURSES FOR CHART
        IF 200: courses array → calculateSemesterGPAs() → createGPAChart()

      On success:
        courseGrades = data.course_grades                  (array of {course_code, grade, gpa})
        semesterGPAs = calculateSemesterGPAs(courses, courseGrades)
        latestSemGPA = semesterGPAs[last].gpa              (most recent semester)
        totalCredits = courses.reduce(sum credit_hours)    (ALL enrolled, not just graded)
        createGPAChart(semesterGPAs)                       (destroy old instance first)

    → loadCourses() [uses window.API.get — OK]
    → loadAllAssessmentTypesTrend() [uses window.API.get — OK]

    KEY INSIGHT: If Render is cold, loadGPA() fails silently.
    loadCourses() is called AFTER and uses window.API.get, but by then
    Render may have warmed up — so courses table loads fine while
    GPA/chart/credits are empty. This explains the user's observation
    "dashboard data not rendering" for GPA but courses show up.
```

### Trace 3: GPA Forecast → Current Summary + What-If

```
gpa-forecast.html loads → gpa-forecast.js window.onload
  → loadCurrentSummary(userId)
    → window.gpaService.getBreakdown(userId)
      → window.API.get(`/api/gpa/${userId}/breakdown`)
        ← {semesters: [...], cumulative_gpa: X, total_credits: Y}
    → currentTermGPA = semesters[last].gpa            ✅ FIXED
    → currentCumulativeGPA = cumGPA                   ✅ OK
    → creditsEarned = credits                         ✅ OK
    → window.currentSummary = {cumulative_gpa, total_credits}

  → runAnalysis() [user clicks button]
    → forecastService.predictGPA(currentSummary.cumulative_gpa, currentSummary.total_credits, hypotheticalCourses)
      → window.API.post('/api/forecast/gpa', {
            current_gpa: ...,           ← WRONG: backend expects current_summary.cumulative_gpa
            credits_earned: ...,        ← WRONG: backend expects current_summary.total_credits
            courses: [...]              ← WRONG: backend expects hypothetical_courses
        })                                                                    ← BUG-02
      → Backend: current_summary = None, hypothetical_courses = []
      → Backend defaults: current_summary = {cumulative_gpa: 0, total_credits: 0}
      → Returns valid but zeroed-out response

    RESULT: Forecast analysis always uses 0 GPA / 0 credits — useless results.
```

### Trace 4: Grade Forecast → Course Grade Prediction

```
grade-forecast.html loads → grade-forecast.js window.onload
  → setupEventListeners()
  → AssessmentTable.init() → fetches assessment types from API

  → runAnalysis() [user clicks button]
    → targetGrade = parseFloat(document.getElementById('targetGrade').value)
    → assessments = AssessmentTable.getData()
    → forecastService.predictCourseGrade(assessments)   ← BUG-03: targetGrade not passed
      → window.API.post('/api/forecast/course-grade', { assessments })
        ← target_grade = None on backend
      → Backend: target_analysis = None, minimum_required = "TBD" for all unknowns
    → result.assessments rendered BUT minimum_required is always "TBD"

    RESULT: Target analysis never works. User can't see minimum grades needed.
```

### Trace 5: Password Reset

```
forgot-password.html → forgot-password.js
  → API.post('/api/auth/reset-password', { email, newPassword })
    → Backend: data.get('new_password') → None                    ← BUG-04
    → generate_password_hash(None) → TypeError
    → except → 500 {"success": false, "message": "..."}
    → Frontend shows error

    RESULT: Password reset is completely broken.
```

---

## Priority Fix Order

| Priority | Bug | Impact | Effort |
|----------|-----|--------|--------|
| **P0** | BUG-01 | Dashboard GPA/chart/credits fail on every cold-start | 2 lines |
| **P0** | BUG-02 | GPA Forecast always returns zeros | 10 lines |
| **P0** | BUG-04 | Password reset completely broken | 1 line |
| **P1** | BUG-03 | Grade Forecast target analysis never works | 5 lines |
| **P1** | BUG-05 | Register error messages swallowed | 1 line |
| **P1** | BUG-06 | Delete assessment raw fetch | 1 line |
| **P2** | BUG-07 | Admin hardcoded Fall semester | 10 lines |
| **P2** | BUG-08 | GpaChart.js old green colors | 5 lines |
| **P2** | BUG-09 | Grading scale edge case at 100% | 1 line (SQL) |
| **P2** | BUG-10 | GPA calculation inconsistency between endpoints | 5 lines |
| **P3** | BUG-11 | PostgreSQL lastrowid returns 0 | 15 lines |

---

## Recommended Fixes (Code)

### FIX for BUG-01: `student.js` — Replace raw fetch with API wrapper

**File:** `frontend/js/pages/dashboard/student.js` lines 53-61

```js
// BEFORE (broken):
const response = await fetch(`${window.API_URL}/api/calculate-gpa/${currentUser.id}`);
const data = await response.json();
// ...
const coursesResponse = await fetch(`${window.API_URL}/api/courses/${currentUser.id}`);
const courses = await coursesResponse.json();

// AFTER (fixed):
const data = await window.API.get(`/api/calculate-gpa/${currentUser.id}`);
// ...
const courses = await window.API.get(`/api/courses/${currentUser.id}`);
```

### FIX for BUG-02: `forecastService.js` — Correct payload field names

**File:** `frontend/js/services/forecastService.js`

```js
// BEFORE (broken):
async predictGPA(currentGPA, currentCredits, courses) {
    return window.API.post('/api/forecast/gpa', {
        current_gpa: currentGPA,
        credits_earned: currentCredits,
        courses: courses
    });
}

// AFTER (fixed):
async predictGPA(currentGPA, currentCredits, courses, targetGPA) {
    return window.API.post('/api/forecast/gpa', {
        current_summary: {
            cumulative_gpa: currentGPA,
            total_credits: currentCredits
        },
        hypothetical_courses: courses,
        target_gpa: targetGPA || null
    });
}
```

**Also update caller in** `frontend/js/pages/tools/gpa-forecast.js` `runAnalysis()`:
```js
const result = await window.forecastService.predictGPA(
    currentSummary.cumulative_gpa,
    currentSummary.total_credits,
    hypotheticalCourses,
    targetGPA  // ← add this argument
);
```

### FIX for BUG-03: `forecastService.js` + `grade-forecast.js` — Pass target_grade

**File:** `frontend/js/services/forecastService.js`
```js
async predictCourseGrade(assessments, targetGrade) {
    return window.API.post('/api/forecast/course-grade', {
        assessments: assessments,
        target_grade: targetGrade || null
    });
}
```

**File:** `frontend/js/pages/tools/grade-forecast.js`
```js
const result = await window.forecastService.predictCourseGrade(assessments, targetGrade);
```

### FIX for BUG-04: `forgot-password.js` — Fix field name

**File:** `frontend/js/pages/auth/forgot-password.js` line 13
```js
// BEFORE:
{ email: email, newPassword: newPassword }
// AFTER:
{ email: email, new_password: newPassword }
```

### FIX for BUG-05: `register.js` — Read correct error field

**File:** `frontend/js/pages/auth/register.js` line 23
```js
showError(data.message || data.error || 'Failed to register');
```

### FIX for BUG-06: `detail.js` — Replace raw fetch

**File:** `frontend/js/pages/courses/detail.js` `deleteAssessment()`
```js
// BEFORE:
const response = await fetch(`${window.API_URL}/api/delete-assessment/${id}`, {method: 'DELETE'});
if (response.ok) { ... }

// AFTER:
await window.API.delete(`/api/delete-assessment/${id}`);
await loadCourseDetails();
```

---

## Architectural Observations

### 1. No Retry/Queue for Render Cold-Start
Render free tier takes 30-60s to spin up. Every API call during this window returns 503. Consider adding a retry mechanism in `api.js`:
```js
// Retry once after 3s on 503
if (response.status === 503) {
    await new Promise(r => setTimeout(r, 3000));
    return this.fetch(endpoint, options);  // single retry
}
```
This would eliminate most "can't connect" errors users see.

### 2. Sequential Dashboard Loading
`loadDashboardData()` loads everything sequentially:
```js
await loadWeather();   // waits for weather before starting GPA
await loadGPA();       // waits for GPA before starting courses
await loadCourses();   // waits for courses before starting trends
await loadAllAssessmentTypesTrend();
```
These are independent and could be parallelized:
```js
await Promise.allSettled([loadWeather(), loadGPA(), loadCourses()]);
await loadAllAssessmentTypesTrend(); // depends on allCourses from loadCourses
```

### 3. Duplicate Course Fetching
`loadGPA()` fetches courses (raw fetch) and `loadCourses()` fetches courses again (via API wrapper). This is 2 identical HTTP requests. Consider fetching courses once and sharing.
