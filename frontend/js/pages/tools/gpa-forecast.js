// What-If Scenario (GPA Forecast) Controller
// Refactored to use forecastService.js
// Depends on: forecastService.js, gpaService.js

window.onload = async () => {
    // 1. Auth Check
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '../auth/login.html';
        return;
    }
    const user = JSON.parse(userData);

    // 2. Setup UI
    setupHeader(user);
    setupEventListeners();

    // 3. Load Initial Data (Current Summary)
    await loadCurrentSummary(user.id);
};

function setupHeader(user) {
    const nameEl = document.getElementById('studentName');
    if (nameEl && user.name) {
        nameEl.textContent = user.name;
        nameEl.style.cursor = 'pointer';
        nameEl.addEventListener('click', () => { window.location.href = 'profile.html'; });
    }
}

async function loadCurrentSummary(userId) {
    try {
        const summary = await window.gpaService.getBreakdown(userId); // Or getSummary if only cum needed
        const cumGPA = summary.cumulative_gpa || 0;
        const credits = summary.total_credits || 0;

        document.getElementById('currentCumulativeGPA').textContent = cumGPA.toFixed(2);
        document.getElementById('creditsEarned').textContent = credits;

        // Store for payload
        window.currentSummary = { cumulative_gpa: cumGPA, total_credits: credits };

        // Reset term GPA display
        document.getElementById('currentTermGPA').textContent = "0.00"; // Start fresh
    } catch (e) {
        console.error('Failed to load summary', e);
    }
}

function setupEventListeners() {
    document.getElementById('addCourseRow')?.addEventListener('click', addEmptyRow);
    document.getElementById('runAnalysisBtn')?.addEventListener('click', runAnalysis);
    document.getElementById('resetInputs')?.addEventListener('click', resetInputs);

    // Initialize with one row
    addEmptyRow();
}

function addEmptyRow() {
    const tbody = document.getElementById('whatIfBody');
    if (!tbody) return;

    // Remove "No courses" row if it exists
    if (tbody.children.length === 1 && tbody.children[0].innerText.includes('No future courses')) {
        tbody.innerHTML = '';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm" placeholder="Code"></td>
        <td><input type="text" class="form-control form-control-sm" placeholder="Name"></td>
        <td><input type="number" class="form-control form-control-sm text-center" value="3.0" step="0.5"></td>
        <td><input type="number" class="form-control form-control-sm text-center" placeholder="Optional %"></td>
        <td class="text-center"><button class="btn btn-sm btn-danger remove-btn">Delete</button></td>
    `;

    tr.querySelector('.remove-btn').addEventListener('click', () => {
        tr.remove();
        if (tbody.children.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No future courses added. Click "+ Add Course" to begin.</td></tr>';
        }
    });

    tbody.appendChild(tr);
}

function resetInputs() {
    document.getElementById('whatIfBody').innerHTML = '<tr><td colspan="5" class="text-center">No future courses added. Click "+ Add Course" to begin.</td></tr>';
    document.getElementById('targetGPA').value = '';
    document.getElementById('gpaResultsContainer').style.display = 'none';
    addEmptyRow();
}

async function runAnalysis() {
    // Gather Inputs
    const currentSummary = window.currentSummary || { cumulative_gpa: 0, total_credits: 0 };
    const targetGPA = parseFloat(document.getElementById('targetGPA').value);

    if (isNaN(targetGPA) || targetGPA < 0 || targetGPA > 4.33) {
        alert("Please enter a valid target GPA (0.0 - 4.33)");
        return;
    }

    const rows = Array.from(document.querySelectorAll('#whatIfBody tr'));
    const hypotheticalCourses = [];

    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length < 4) return;

        const code = inputs[0].value.trim();
        const credits = parseFloat(inputs[2].value);
        const hypoGrade = inputs[3].value ? parseFloat(inputs[3].value) : null;

        if (code && !isNaN(credits)) {
            hypotheticalCourses.push({
                code: code,
                credits: credits,
                hypothetical: hypoGrade
            });
        }
    });

    if (hypotheticalCourses.length === 0) {
        alert("Please add at least one valid future course.");
        return;
    }

    // Call API
    try {
        const result = await window.forecastService.predictGPA(
            currentSummary.cumulative_gpa,
            currentSummary.total_credits,
            hypotheticalCourses
        );

        renderResults(result);

    } catch (error) {
        alert("Error running analysis: " + error.message);
    }
}

function renderResults(result) {
    const container = document.getElementById('gpaResultsContainer');
    container.style.display = 'block';

    // Projected Stats
    document.getElementById('projectionCurrentGPA').textContent = result.current.gpa.toFixed(2);
    document.getElementById('projectionTargetGPA').textContent = result.target_analysis?.target_gpa?.toFixed(2) || '-';
    document.getElementById('projectedCumulativeGPA').textContent = result.projected.cumulative_gpa.toFixed(2);

    // Status Badge/Message
    // We can add a sophisticated status bar if needed, logic is in result.target_analysis

    // Table Results (Detailed Breakdown)
    const tbody = document.getElementById('analysisResultsBody');
    tbody.innerHTML = result.courses.map(c => `
        <tr>
            <td>${c.course_code || '-'}</td>
            <td>Future Course</td>
            <td class="text-center">${c.credits}</td>
            <td class="text-center">${c.hypothetical !== null ? c.hypothetical.toFixed(2) : '-'}</td>
            <td class="text-center fw-bold ${getMinReqColor(c.minimum_required)}">${c.minimum_required}</td>
            <td class="text-center">-</td> 
        </tr>
    `).join('');

    document.getElementById('analysisResults').style.display = 'block';
}

function getMinReqColor(val) {
    if (val === 'Impossible') return 'text-danger';
    if (val === '0.00' || val === 'Satisfied') return 'text-success';
    return 'text-primary';
}
