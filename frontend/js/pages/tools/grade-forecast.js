// Grade Forecast Controller
// Refactored to use forecastService.js (Backend Logic) and AssessmentTable.js (UI)
// Depends on: forecastService.js, AssessmentTable.js

window.onload = async () => {
    // 1. Auth Check (Simple presence check)
    if (!localStorage.getItem('user')) {
        window.location.href = '../auth/login.html';
        return;
    }

    // 2. Setup
    setupEventListeners();
    await window.AssessmentTable.init();
    window.AssessmentTable.reset();
};

function setupEventListeners() {
    document.getElementById('addAssessmentBtn')?.addEventListener('click', () => {
        window.AssessmentTable.addRow();
    });

    document.getElementById('runAnalysisBtn')?.addEventListener('click', runAnalysis);

    document.getElementById('resetBtn')?.addEventListener('click', () => {
        document.getElementById('targetGrade').value = '';
        document.getElementById('resultsContainer').style.display = 'none';
        window.AssessmentTable.reset();
    });

    // Navbar name click
    const user = JSON.parse(localStorage.getItem('user'));
    const nameEl = document.getElementById('studentName');
    if (nameEl && user?.name) {
        nameEl.textContent = user.name;
        nameEl.style.cursor = 'pointer';
        nameEl.addEventListener('click', () => { window.location.href = 'profile.html'; });
    }
}

async function runAnalysis() {
    const targetGrade = parseFloat(document.getElementById('targetGrade').value);

    if (isNaN(targetGrade) || targetGrade < 0 || targetGrade > 100) {
        alert("Please enter a valid target grade (0-100)");
        return;
    }

    const assessments = window.AssessmentTable.getData();

    // Validate Total Weight
    const totalWeight = assessments.reduce((sum, a) => sum + (a.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
        alert(`Total weight must be 100%. Current: ${totalWeight.toFixed(2)}%`);
        return;
    }

    try {
        const result = await window.forecastService.predictCourseGrade(assessments);
        window.AssessmentTable.renderResults(result.assessments, targetGrade);

        if (result.target_analysis?.status === 'Impossible') {
            alert("Note: The target grade is mathematically impossible with current known marks.");
        }

    } catch (error) {
        console.error(error);
        alert("Error running analysis: " + error.message);
    }
}
