const API_URL = 'http://127.0.0.1:5000';

let currentUser = null;
let userId = null;
let courses = []; // {course_id?, course_code, course_name, credit_hours, currentPercent, hypothetical, _isNew}

window.onload = async () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = JSON.parse(userData);
    console.log('what-if loaded user:', currentUser);
    // support different back-end shapes
    userId = currentUser.id ?? currentUser.user_id ?? currentUser.userId ?? null;
    if (!userId) {
        console.error('Unable to determine user id from stored user:', currentUser);
        window.location.href = 'index.html';
        return;
    }

    // Make student name clickable
    const studentNameEl = document.getElementById('studentName');
    if (studentNameEl && currentUser.name) {
        studentNameEl.textContent = currentUser.name;
        studentNameEl.style.cursor = 'pointer';
        studentNameEl.addEventListener('click', () => {
            window.location.href = 'account-information.html';
        });
    }

    // load summary and courses
    await loadSummary();
    await loadCourses();

    document.getElementById('addCourseRow')?.addEventListener('click', addEmptyRow);
    document.getElementById('runAnalysisBtn')?.addEventListener('click', runAnalysis);
    document.getElementById('resetInputs')?.addEventListener('click', resetInputs);
    // clamp target GPA to 0-4 while typing
    const targetEl = document.getElementById('targetGPA');
    // Prevent more than 2 decimal places on keydown
    targetEl?.addEventListener('keydown', (e) => {
        const value = e.target.value;
        if (value.includes('.')) {
            const parts = value.split('.');
            if (parts[1] && parts[1].length >= 2) {
                const cursorPos = e.target.selectionStart;
                const decimalPos = value.indexOf('.');
                if (cursorPos > decimalPos && e.key >= '0' && e.key <= '9') {
                    e.preventDefault();
                }
            }
        }
    });
    // clamp to 0-4 while typing but don't rewrite the string (allow decimals to be entered)
    targetEl?.addEventListener('input', () => {
        if (targetEl.value === '') return;
        const v = Number(targetEl.value);
        if (!isFinite(v)) return; // allow partial input like '3.' or '.5'
        if (v > 4) targetEl.value = '4';
        if (v < 0) targetEl.value = '0';
    });
    // format to two decimals on blur
    targetEl?.addEventListener('blur', () => {
        if (targetEl.value === '') return;
        let v = Number(targetEl.value);
        if (!isFinite(v)) { targetEl.value = ''; return; }
        v = Math.max(0, Math.min(4, v));
        targetEl.value = v.toFixed(2);
    });
};

async function loadSummary() {
    try {
        const resp = await fetch(`${API_URL}/calculate-gpa/${userId}`);
        if (resp.ok) {
            const data = await resp.json();
            document.getElementById('currentTermGPA').textContent = data.semester_gpa ?? '-';
            document.getElementById('currentCumulativeGPA').textContent = data.cumulative_gpa ?? '-';

            // Calculate total credits same way as student dashboard
            const coursesResponse = await fetch(`${API_URL}/courses/${userId}`);
            const coursesList = await coursesResponse.json();
            const totalCredits = coursesList.reduce((sum, course) => sum + (course.credit_hours || 0), 0);
            document.getElementById('creditsEarned').textContent = totalCredits;

            window.__whatif_summary = data;
            return;
        }
    } catch (e) {
        console.warn('Failed to fetch summary', e);
    }
    document.getElementById('currentTermGPA').textContent = '-';
    document.getElementById('currentCumulativeGPA').textContent = '-';
    document.getElementById('creditsEarned').textContent = '-';
}

async function loadCourses() {
    // Do NOT load existing or past courses for the editable/future list.
    // The student should add future courses manually using the + Add Course button.
    const tbody = document.getElementById('whatIfBody');
    if (!tbody) return;
    courses = [];
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No future courses added. Click "+ Add Course" to begin.</td></tr>';
    renderTable();
}

function renderTable(skipSync = false) {
    // preserve any user edits in the DOM back into the courses array
    if (!skipSync) {
        syncFromDom();
    }
    const tbody = document.getElementById('whatIfBody');
    if (!tbody) return;
    if (!courses || courses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No future courses added. Click "+ Add Course" to begin.</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    for (let i = 0; i < courses.length; i++) {
        const c = courses[i];
        const tr = document.createElement('tr');
        tr.dataset.courseId = c.course_id ?? '';
        tr.dataset.index = i;

        const codeTd = document.createElement('td');
        const codeInput = document.createElement('input');
        codeInput.type = 'text';
        codeInput.className = 'form-control form-control-sm';
        codeInput.value = c.course_code || '';
        codeInput.placeholder = 'Course code';
        codeInput.disabled = !c._isNew;
        codeTd.appendChild(codeInput);

        const nameTd = document.createElement('td');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'form-control form-control-sm';
        nameInput.value = c.course_name || '';
        nameInput.placeholder = 'Course name';
        nameInput.disabled = !c._isNew;
        nameTd.appendChild(nameInput);

        const creditsTd = document.createElement('td');
        const creditsInput = document.createElement('input');
        creditsInput.type = 'number';
        creditsInput.step = '0.5';
        creditsInput.className = 'form-control form-control-sm text-center';
        creditsInput.min = '0';
        creditsInput.max = '5';
        creditsInput.value = (c.credit_hours !== null && c.credit_hours !== undefined) ? Number(c.credit_hours).toFixed(2) : '0.00';
        creditsInput.placeholder = 'Credits';
        creditsInput.disabled = !c._isNew;
        // Prevent symbols - only allow numbers and decimal point
        creditsInput.addEventListener('keypress', (e) => {
            if (!((e.charCode >= 48 && e.charCode <= 57) || e.charCode == 46)) {
                e.preventDefault();
            }
        });
        // Prevent more than 2 decimal places on keydown
        creditsInput.addEventListener('keydown', (e) => {
            const value = e.target.value;
            if (value.includes('.')) {
                const parts = value.split('.');
                if (parts[1] && parts[1].length >= 2 && e.key >= '0' && e.key <= '9' && !e.target.selectionStart < value.indexOf('.') + 3) {
                    const cursorPos = e.target.selectionStart;
                    const decimalPos = value.indexOf('.');
                    if (cursorPos > decimalPos && parts[1].length >= 2 && e.key >= '0' && e.key <= '9') {
                        e.preventDefault();
                    }
                }
            }
        });
        // limit to 2 decimals and max 5 while typing
        creditsInput.addEventListener('input', () => {
            if (creditsInput.value === '') return;
            let s = creditsInput.value;
            if (s.includes('.')) {
                const parts = s.split('.');
                parts[1] = parts[1].slice(0, 2);
                creditsInput.value = parts[0] + '.' + parts[1];
            }
            let v = Number(creditsInput.value);
            if (!isFinite(v)) { creditsInput.value = ''; return; }
            if (v > 5) creditsInput.value = '5.00';
            if (v < 0) creditsInput.value = '0.00';
        });
        creditsTd.appendChild(creditsInput);

        const hypoTd = document.createElement('td');
        const hypoInput = document.createElement('input');
        hypoInput.type = 'number';
        hypoInput.step = '0.01';
        hypoInput.className = 'form-control form-control-sm text-center hypothetical-input';
        hypoInput.min = 0;
        hypoInput.max = 100;
        hypoInput.value = (c.hypothetical !== null && c.hypothetical !== undefined) ? Number(c.hypothetical).toFixed(2) : '';
        hypoInput.placeholder = 'e.g. 85';
        // Prevent more than 2 decimal places on keydown
        hypoInput.addEventListener('keydown', (e) => {
            const value = e.target.value;
            if (value.includes('.')) {
                const parts = value.split('.');
                if (parts[1] && parts[1].length >= 2) {
                    const cursorPos = e.target.selectionStart;
                    const decimalPos = value.indexOf('.');
                    if (cursorPos > decimalPos && e.key >= '0' && e.key <= '9') {
                        e.preventDefault();
                    }
                }
            }
        });
        // limit decimals to 2 and enforce 0-100 bounds while typing
        hypoInput.addEventListener('input', () => {
            if (hypoInput.value === '') return;
            let s = hypoInput.value;
            if (s.includes('.')) {
                const parts = s.split('.');
                parts[1] = parts[1].slice(0, 2);
                hypoInput.value = parts[0] + '.' + parts[1];
            }
            let v = Number(hypoInput.value);
            if (!isFinite(v)) { hypoInput.value = ''; return; }
            if (v > 100) hypoInput.value = '100.00';
            if (v < 0) hypoInput.value = '0.00';
        });
        hypoTd.appendChild(hypoInput);

        const actionsTd = document.createElement('td');
        actionsTd.className = 'text-center align-middle';
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.type = 'button';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', (e) => {
            // Get the current index from the row's dataset to avoid stale closure
            const row = e.target.closest('tr');
            const currentIndex = parseInt(row.dataset.index);
            deleteHypothetical(currentIndex);
        });
        actionsTd.appendChild(delBtn);

        tr.append(codeTd, nameTd, creditsTd, hypoTd, actionsTd);
        tbody.appendChild(tr);
    }
}

function deleteHypothetical(index) {
    // Sync DOM values first to preserve user edits
    syncFromDom();
    // Now delete from the synced array
    const item = courses[index];
    if (!item) return;
    if (item._isNew) {
        courses.splice(index, 1);
    } else {
        item.hypothetical = null;
    }
    renderTable(true); // Skip sync since we just did it
}

function addEmptyRow() {
    // sync current DOM inputs into the courses array so we don't lose user edits
    syncFromDom();

    const newRow = {
        course_id: null,
        course_code: '',
        course_name: '',
        credit_hours: 3,
        currentPercent: null,
        hypothetical: null,
        _isNew: true
    };
    courses.push(newRow);
    renderTable();

    const tbody = document.getElementById('whatIfBody');
    const tr = tbody.lastElementChild;
    if (!tr) return;
    const inputs = tr.querySelectorAll('input');
    if (inputs.length >= 4) {
        inputs[0].disabled = false;
        inputs[1].disabled = false;
        inputs[2].disabled = false;
    }
}

function resetInputs() {
    const kept = courses.filter(c => !c._isNew).map(c => ({ ...c, hypothetical: null }));
    courses = kept;
    renderTable();
    document.getElementById('projectedTermGPA').textContent = '-';
    document.getElementById('projectionCurrentGPA').textContent = '-';
    document.getElementById('projectionTargetGPA').textContent = '-';
    document.getElementById('projectedCumulativeGPA').textContent = '-';
    // Hide results container on reset
    const resultsContainer = document.getElementById('gpaResultsContainer');
    if (resultsContainer) resultsContainer.style.display = 'none';
}

function percentToGpa(pct) {
    if (pct === null || pct === undefined || !isFinite(pct)) return null;
    const g = (pct / 100) * 4.0;
    return Math.max(0, Math.min(4.0, g));
}

function getTableData() {
    const tbody = document.getElementById('whatIfBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const list = rows.map(r => {
        const inputs = r.querySelectorAll('input');
        if (inputs.length < 4) return null;
        const code = inputs[0].value;
        const name = inputs[1].value;
        const credits = Math.round((Number(inputs[2].value) || 0) * 100) / 100;
        // Current grade column removed; we treat currentPercent as null for future courses
        const currentPercent = null;
        const hypo = inputs[3].value ? Math.round(Number(inputs[3].value) * 100) / 100 : null;
        return { code, name, credits, currentPercent, hypo, row: r };
    }).filter(Boolean);
    return list;
}

function runAnalysis() {
    // ensure we have latest edits saved
    syncFromDom();
    let targetGPA = Number(document.getElementById('targetGPA').value);
    if (!isFinite(targetGPA)) targetGPA = NaN;
    if (isFinite(targetGPA)) {
        targetGPA = Math.max(0, Math.min(4, targetGPA));
        // round to two decimals for calculations
        targetGPA = Math.round(targetGPA * 100) / 100;
    }
    const table = getTableData();
    console.log('runAnalysis:', { targetGPA, tableLength: table.length, summary: window.__whatif_summary });

    // Validate target GPA is not blank
    const targetInput = document.getElementById('targetGPA');
    if (!Number.isFinite(targetGPA) || targetInput.value === '') {
        targetInput.setCustomValidity('Target GPA cannot be blank');
        targetInput.reportValidity();
        return;
    } else {
        targetInput.setCustomValidity('');
    }

    if (table.length === 0) return alert('No courses to analyze');

    // Validate all courses have course code and course name
    const tbody = document.getElementById('whatIfBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    for (let i = 0; i < table.length; i++) {
        const c = table[i];
        const inputs = rows[i].querySelectorAll('input');

        if (!c.code || c.code.trim() === '') {
            if (inputs.length >= 1) {
                inputs[0].setCustomValidity('Course Code cannot be blank');
                inputs[0].reportValidity();
            }
            return;
        } else if (inputs.length >= 1) {
            inputs[0].setCustomValidity('');
        }

        if (!c.name || c.name.trim() === '') {
            if (inputs.length >= 2) {
                inputs[1].setCustomValidity('Course Name cannot be blank');
                inputs[1].reportValidity();
            }
            return;
        } else if (inputs.length >= 2) {
            inputs[1].setCustomValidity('');
        }
    }

    let termWeightedSum = 0;
    let termCredits = 0;
    for (const c of table) {
        const usePct = (c.hypo !== null && !isNaN(c.hypo)) ? c.hypo : c.currentPercent;
        if (usePct === null || usePct === undefined || isNaN(usePct)) continue;
        termWeightedSum += usePct * c.credits;
        termCredits += c.credits;
    }

    const termAvgPercent = termCredits > 0 ? termWeightedSum / termCredits : null;
    const projectedTermGPA = termAvgPercent !== null ? percentToGpa(termAvgPercent) : null;

    const summary = window.__whatif_summary || null;

    document.getElementById('projectedTermGPA').textContent = projectedTermGPA ? projectedTermGPA.toFixed(2) : '-';

    // Update current and target GPA displays
    if (summary) {
        const currentCumulativeGpa = Number(summary.cumulative_gpa) || 0;
        document.getElementById('projectionCurrentGPA').textContent = currentCumulativeGpa.toFixed(2);
    } else {
        document.getElementById('projectionCurrentGPA').textContent = '-';
    }

    document.getElementById('projectionTargetGPA').textContent = Number.isFinite(targetGPA) ? targetGPA.toFixed(2) : '-';

    // Show the results container when analysis runs
    const resultsContainer = document.getElementById('gpaResultsContainer');
    if (resultsContainer) resultsContainer.style.display = '';

    // Build a computed results array from current table rows; we'll calculate minimums per spec.
    const computedResults = table.map(c => ({ code: c.code, name: c.name, credits: c.credits, hypothetical: c.hypo, minimumRequired: '-' }));

    // If targetGPA or summary missing, do nothing (no results shown)
    if (!Number.isFinite(targetGPA) || !summary) {
        const resultsCard = document.getElementById('analysisResults');
        if (resultsCard) resultsCard.style.display = 'none';
        const editCard = document.getElementById('editableSummary');
        if (editCard) editCard.style.display = 'none';
        document.getElementById('projectedCumulativeGPA').textContent = '-';
        return;
    }

    // Convert current cumulative info to grade points
    const currentCredits = Number(summary.total_credits) || 0;
    const currentCumulativeGpa = Number(summary.cumulative_gpa) || 0;
    const currentGradePoints = currentCumulativeGpa * currentCredits;

    // Totals for future courses
    const futureCreditsTotal = table.reduce((s, r) => s + (Number(r.credits) || 0), 0);

    // Points already accounted from hypothetical grades entered for future courses
    let hypoPoints = 0;
    for (const r of table) {
        if (r.hypo !== null && r.hypo !== undefined) {
            const gp = percentToGpa(r.hypo);
            hypoPoints += gp * (Number(r.credits) || 0);
        }
    }

    const totalNeededGradePoints = targetGPA * (currentCredits + futureCreditsTotal);
    let remainingPoints = totalNeededGradePoints - currentGradePoints - hypoPoints;

    // Unknown courses
    const unknownCourses = table.filter(r => r.hypo === null || r.hypo === undefined);
    const unknownCredits = unknownCourses.reduce((s, r) => s + (Number(r.credits) || 0), 0);

    // Best-case check: if all unknowns are 100%
    const bestCasePoints = currentGradePoints + hypoPoints + (4.0 * unknownCredits);
    const bestCaseGPA = (currentCredits + futureCreditsTotal) > 0 ? (bestCasePoints / (currentCredits + futureCreditsTotal)) : 0;

    console.log('whatif debug:', { currentCredits, currentGradePoints, futureCreditsTotal, hypoPoints, totalNeededGradePoints, remainingPoints, unknownCredits, bestCaseGPA });

    if (unknownCredits === 0) {
        // No unknown courses: either goal already met or impossible
        if (remainingPoints <= 0) {
            // already satisfied
            // mark all as N/A or show 0
            for (const cr of computedResults) cr.minimumRequired = '0.00';
        } else {
            // impossible
            for (const cr of computedResults) cr.minimumRequired = 'Impossible';
        }
    } else {
        if (remainingPoints <= 0) {
            // already satisfied, minimum 0 for unknowns
            for (const cr of computedResults) {
                if (unknownCourses.find(u => u.code === cr.code && u.name === cr.name)) cr.minimumRequired = '0.00';
            }
        } else {
            // compute required grade point per credit across unknown credits
            const requiredGpPerCredit = remainingPoints / unknownCredits;
            const requiredPercent = (requiredGpPerCredit / 4.0) * 100;
            if (requiredPercent > 100 && bestCaseGPA < targetGPA) {
                // impossible even at 100%
                for (const cr of computedResults) cr.minimumRequired = 'Impossible';
            } else {
                // distribute same percent across unknowns (weighted by credits implicitly)
                const needPct = Math.max(0, Math.min(100, requiredPercent));
                const display = (Math.round(needPct * 100) / 100).toFixed(2);
                for (const cr of computedResults) {
                    if (unknownCourses.find(u => u.code === cr.code && u.name === cr.name)) cr.minimumRequired = display;
                }
            }
        }
    }

    console.log('computedResults after calc:', computedResults);

    // Calculate projected cumulative GPA after completing future courses with minimum required grades
    let futureGradePoints = 0;
    for (const cr of computedResults) {
        let gradeToUse = cr.hypothetical; // Use hypothetical if provided
        if (gradeToUse === null || gradeToUse === undefined) {
            // Use minimum required if no hypothetical
            const minReq = cr.minimumRequired;
            if (minReq !== '-' && minReq !== 'Impossible') {
                const numericMin = parseFloat(minReq);
                if (!isNaN(numericMin)) {
                    gradeToUse = numericMin;
                }
            }
        }
        if (gradeToUse !== null && gradeToUse !== undefined && !isNaN(gradeToUse)) {
            const gpa = percentToGpa(gradeToUse);
            futureGradePoints += gpa * (Number(cr.credits) || 0);
        }
    }

    const totalCreditsAfterFuture = currentCredits + futureCreditsTotal;
    const totalGradePointsAfterFuture = currentGradePoints + futureGradePoints;
    const projectedCumulativeGPA = totalCreditsAfterFuture > 0 ? totalGradePointsAfterFuture / totalCreditsAfterFuture : 0;

    document.getElementById('projectedCumulativeGPA').textContent = projectedCumulativeGPA.toFixed(2);

    // show only the detailed course breakdown
    const editCard = document.getElementById('editableSummary');
    if (editCard) editCard.style.display = 'none';
    renderAnalysisResults(computedResults);
}

function renderAnalysisResults(results) {
    console.log('renderAnalysisResults called, rows:', results.length);
    const body = document.getElementById('analysisResultsBody');
    const card = document.getElementById('analysisResults');
    if (!body || !card) return;
    if (!results || results.length === 0) {
        body.innerHTML = '<tr><td colspan="6" class="text-center">No data</td></tr>';
        card.style.display = 'none';
        return;
    }
    card.style.display = '';
    body.innerHTML = '';
    for (const r of results) {
        const tr = document.createElement('tr');
        const codeTd = document.createElement('td'); codeTd.textContent = r.code || '-';
        const nameTd = document.createElement('td'); nameTd.textContent = r.name || '-';
        const creditsTd = document.createElement('td'); creditsTd.className = 'text-center'; creditsTd.textContent = (r.credits !== null && r.credits !== undefined) ? (Math.round(r.credits * 100) / 100).toFixed(2) : '-';
        const hypoTd = document.createElement('td'); hypoTd.className = 'text-center'; hypoTd.textContent = (r.hypothetical === null || r.hypothetical === undefined) ? '-' : (Number(r.hypothetical).toFixed(2));
        const minTd = document.createElement('td'); minTd.className = 'text-center'; minTd.textContent = r.minimumRequired;
        const letterTd = document.createElement('td'); letterTd.className = 'text-center';
        // compute letter grade from numeric minimumRequired when possible
        let letter = r.minimumRequired;
        const numeric = Number(r.minimumRequired);
        if (isFinite(numeric)) {
            letter = percentToLetter(numeric);
        }
        letterTd.textContent = letter;
        tr.append(codeTd, nameTd, creditsTd, hypoTd, minTd, letterTd);
        body.appendChild(tr);
    }
}

function percentToLetter(pct) {
    if (pct === null || pct === undefined || !isFinite(pct)) return '-';
    const p = Number(pct);
    // grading scale (percent -> letter)
    // A: 90-100, A-:85-89.99, B+:80-84.99, B:75-79.99, B-:70-74.99
    // C+:65-69.99, C:60-64.99, C-:55-59.99, D:50-54.99, F:<50
    if (p >= 90) return 'A';
    if (p >= 85) return 'A-';
    if (p >= 80) return 'B+';
    if (p >= 75) return 'B';
    if (p >= 70) return 'B-';
    if (p >= 65) return 'C+';
    if (p >= 60) return 'C';
    if (p >= 55) return 'C-';
    if (p >= 50) return 'D';
    return 'F';
}

// Render a simple summary table using the current editable courses (table) and the computed minimums (results)
function renderEditableSummary(table, results) {
    const body = document.getElementById('editableSummaryBody');
    const card = document.getElementById('editableSummary');
    if (!body || !card) return;
    if (!table || table.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="text-center">No courses</td></tr>';
        card.style.display = 'none';
        return;
    }
    card.style.display = '';
    body.innerHTML = '';

    // Build a lookup of minimums by course code + name (fallback index)
    const minMap = new Map();
    for (const r of results || []) {
        const key = `${r.code}||${r.name}`;
        minMap.set(key, r.minimumRequired);
    }

    for (let i = 0; i < table.length; i++) {
        const c = table[i];
        const tr = document.createElement('tr');
        const codeTd = document.createElement('td'); codeTd.textContent = c.code || '-';
        const nameTd = document.createElement('td'); nameTd.textContent = c.name || '-';
        const creditsTd = document.createElement('td'); creditsTd.className = 'text-center'; creditsTd.textContent = (c.credits !== null && c.credits !== undefined) ? (Number(c.credits).toFixed(2)) : '-';
        const hypoTd = document.createElement('td'); hypoTd.className = 'text-center'; hypoTd.textContent = (c.hypo === null || c.hypo === undefined) ? '-' : Number(c.hypo).toFixed(2);
        const key = `${c.code}||${c.name}`;
        let minVal = minMap.has(key) ? minMap.get(key) : null;
        // fallback to results by index (same order) if lookup failed
        if ((minVal === null || minVal === undefined || minVal === '-') && results && results[i]) {
            minVal = results[i].minimumRequired ?? results[i].minimum ?? '-';
        }
        const minTd = document.createElement('td'); minTd.className = 'text-center'; minTd.textContent = (minVal === null || minVal === undefined) ? '-' : String(minVal);
        tr.append(codeTd, nameTd, creditsTd, hypoTd, minTd);
        body.appendChild(tr);
    }
}

/* debug dump removed */

window.__whatif_helpers = { runAnalysis, resetInputs };

// Read current table inputs back into `courses` to preserve user edits across re-renders.
function syncFromDom() {
    const tbody = document.getElementById('whatIfBody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const inputs = r.querySelectorAll('input');
        if (!courses[i]) continue;
        if (inputs.length >= 4) {
            courses[i].course_code = inputs[0].value;
            courses[i].course_name = inputs[1].value;
            const cred = Number(inputs[2].value) || 0;
            courses[i].credit_hours = Math.round(cred * 100) / 100;
            const hv = inputs[3].value;
            if (hv === '') {
                courses[i].hypothetical = null;
            } else {
                let hvNum = Number(hv) || 0;
                if (!isFinite(hvNum)) hvNum = 0;
                hvNum = Math.max(0, Math.min(100, hvNum));
                courses[i].hypothetical = hvNum;
            }
        }
    }
}

// expose debug object placeholder
/* debug placeholder removed */
