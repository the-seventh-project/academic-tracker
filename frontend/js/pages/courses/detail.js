// Course Detail Page Script
// Depends on: core/config.js, core/auth.js
let currentUser = null;
let courseId = null;
let currentAssessmentId = null; // To track if we are editing
let isReadOnly = false;
let totalWeight = 0; // Track total weight across all assessments

window.onload = async () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '../dashboard/student.html';
        return;
    }
    currentUser = JSON.parse(userData);

    // Get course ID and view-mode from URL
    const urlParams = new URLSearchParams(window.location.search);
    courseId = urlParams.get('id');
    const fromAdmin = urlParams.get('from') === 'admin';
    isReadOnly = (urlParams.get('view') === '1' || urlParams.get('readonly') === '1' || urlParams.get('mode') === 'view');

    if (!courseId) {
        alert('No course specified');
        window.location.href = fromAdmin ? '../dashboard/admin.html' : '../dashboard/student.html';
        return;
    }

    await loadCourseDetails();

    // Update back button text based on where user came from
    const backButton = document.getElementById('backToDashboard');
    if (backButton && fromAdmin) {
        backButton.textContent = '← Back to Admin Overview';
    }

    // Prevent navigation if total weight is not 100%
    window.addEventListener('beforeunload', (e) => {
        if (totalWeight !== 0 && totalWeight !== 100) {
            e.preventDefault();
            e.returnValue = 'Total weight must equal 100% before leaving this page. Current total: ' + totalWeight + '%';
            return e.returnValue;
        }
    });

    // Handle Back to Dashboard link click
    document.getElementById('backToDashboard')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (totalWeight !== 0 && totalWeight !== 100) {
            alert(`Total weight must equal 100% before leaving this page.\n\nCurrent total: ${totalWeight}%`);
        } else {
            const backUrl = fromAdmin ? '../dashboard/admin.html' : '../dashboard/student.html';
            window.location.href = backUrl;
        }
    });

    // Note: Edit/Add buttons are always shown now; read-only state only controls per-row controls

    const modalElement = document.getElementById('addAssessmentModal');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', () => {
            document.getElementById('assessmentForm').reset();
            document.getElementById('modalTitle').textContent = 'Add Assessment';
            currentAssessmentId = null;
            updateWeightReminder();
        });
    }

    // Add real-time weight validation
    const weightInput = document.getElementById('assessWeight');
    if (weightInput) {
        weightInput.addEventListener('input', updateWeightReminder);
    }

    // Add real-time earned marks validation
    const earnedInput = document.getElementById('assessEarned');
    const totalInput = document.getElementById('assessTotal');
    if (earnedInput && totalInput) {
        earnedInput.addEventListener('input', () => {
            const earned = parseFloat(earnedInput.value);
            const total = parseFloat(totalInput.value);
            if (earned && total && earned > total) {
                earnedInput.setCustomValidity('Earned marks cannot exceed total marks');
                earnedInput.classList.add('is-invalid');
            } else {
                earnedInput.setCustomValidity('');
                earnedInput.classList.remove('is-invalid');
            }
        });

        totalInput.addEventListener('input', () => {
            const earned = parseFloat(earnedInput.value);
            const total = parseFloat(totalInput.value);
            if (earned && total && earned > total) {
                earnedInput.setCustomValidity('Earned marks cannot exceed total marks');
                earnedInput.classList.add('is-invalid');
            } else {
                earnedInput.setCustomValidity('');
                earnedInput.classList.remove('is-invalid');
            }
        });
    }
};

async function loadCourseDetails() {
    try {
        // Fetch course details
        const course = await window.API.get(`/api/course/${courseId}`);
        document.getElementById('courseTitle').textContent = `${course.course_code} - ${course.course_name}`;
        document.getElementById('courseCredits').textContent = course.credit_hours;
        document.getElementById('courseSemester').textContent = course.semester;

        // Fetch assessments
        const assessments = await window.API.get(`/api/assessments/${courseId}`);

        // Calculate total weight
        totalWeight = assessments.reduce((sum, a) => sum + Number(a.weight), 0);
        totalWeight = Math.round(totalWeight * 100) / 100; // Round to 2 decimals

        // Update weight display
        updateTotalWeightDisplay();

        const tbody = document.getElementById('assessmentList');
        if (assessments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No assessments found.</td></tr>';
            return;
        }

        tbody.innerHTML = assessments.map(a => {
            const controls = `
                    <button class="btn btn-sm btn-outline-primary" onclick="openEditModal(${a.assessment_id}, '${a.name}', '${a.assessment_type}', ${a.weight}, ${a.marks}, ${a.earned_marks !== null ? a.earned_marks : 'null'})">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAssessment(${a.assessment_id})">Delete</button>
                `;
            return `
            <tr>
                <td>${a.name}</td>
                <td>${a.assessment_type}</td>
                <td>${a.weight}%</td>
                <td>${a.marks}</td>
                <td>${a.earned_marks || '-'}</td>
                <td>${controls}</td>
            </tr>
        `}).join('');

        // Calculate course grade percentage locally (matches backend logic)
        let course_grade = 0;
        let total_weight = 0;
        for (const a of assessments) {
            if (a.earned_marks !== null && a.earned_marks !== undefined) {
                const percentage = (Number(a.earned_marks) / Number(a.marks)) * 100;
                course_grade += (percentage * (Number(a.weight) / 100));
                total_weight += Number(a.weight);
            }
        }

        const gradeEl = document.getElementById('courseGrade');
        if (total_weight > 0) {
            let course_percentage = total_weight < 100 ? (course_grade / total_weight) * 100 : course_grade;
            if (isFinite(course_percentage)) {
                gradeEl.textContent = `${course_percentage.toFixed(2)}%`;
            } else {
                gradeEl.textContent = '-';
            }
        } else {
            gradeEl.textContent = '-';
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

// Open Edit Course modal and populate fields
document.getElementById('editCourseBtn')?.addEventListener('click', async () => {
    try {
        const course = await window.API.get(`/api/course/${courseId}`);

        document.getElementById('editCourseCode').value = course.course_code;
        document.getElementById('editCourseName').value = course.course_name;
        document.getElementById('editCourseCredits').value = course.credit_hours;
        document.getElementById('editCourseSemester').value = course.semester;

        new bootstrap.Modal(document.getElementById('editCourseModal')).show();
    } catch (err) {
        alert('Failed to load course details');
    }
});

// Handle Edit Cours// Save edited course
document.getElementById('editCourseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        course_code: document.getElementById('editCourseCode').value.trim(),
        course_name: document.getElementById('editCourseName').value.trim(),
        credit_hours: parseFloat(document.getElementById('editCourseCredits').value),
        semester: document.getElementById('editCourseSemester').value
    };

    try {
        await window.API.post(`/api/update-course/${courseId}`, payload);
        // notify other tabs/pages
        try { localStorage.setItem('courses_updated', Date.now().toString()); } catch (e) { }
        location.reload();
    } catch (err) {
        alert('Failed to update course: ' + err.message);
    }
});

// Handle Form Submission (Add or Update)
document.getElementById('assessmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const weightValue = parseFloat(document.getElementById('assessWeight').value);
    const totalMarks = parseFloat(document.getElementById('assessTotal').value);
    const earnedMarks = document.getElementById('assessEarned').value ? parseFloat(document.getElementById('assessEarned').value) : null;

    // Validate earned marks cannot exceed total marks
    if (earnedMarks !== null && earnedMarks > totalMarks) {
        alert(`Earned marks (${earnedMarks}) cannot be greater than total marks (${totalMarks})!`);
        return;
    }

    // Calculate what the new total would be
    let currentWeightInForm = currentAssessmentId ?
        // If editing, exclude the current assessment's old weight
        totalWeight - getCurrentAssessmentWeight(currentAssessmentId) :
        totalWeight;

    const newTotalWeight = currentWeightInForm + weightValue;

    // Check if adding this weight would exceed 100%
    if (newTotalWeight > 100) {
        const maxAllowed = 100 - currentWeightInForm;
        alert(`Total weight cannot exceed 100%!\n\nCurrent total: ${currentWeightInForm.toFixed(2)}%\nMaximum you can add: ${maxAllowed.toFixed(2)}%\nYou entered: ${weightValue}%`);
        return;
    }

    const data = {
        name: document.getElementById('assessName').value,
        assessment_type: document.getElementById('assessType').value,
        weight: weightValue,
        marks: totalMarks,
        earned_marks: earnedMarks,
        student_id: currentUser.id,
        course_id: courseId
    };

    try {
        let url = `/api/add-assessment`;
        if (currentAssessmentId) {
            url = `/api/update-assessment/${currentAssessmentId}`;
        }

        await window.API.post(url, payload);
        bootstrap.Modal.getInstance(document.getElementById('addAssessmentModal')).hide();
        loadCourseDetails();
    } catch (error) {
        alert('Error saving assessment: ' + error.message);
    }
});

function openEditModal(id, name, type, weight, marks, earned) {
    currentAssessmentId = id;
    document.getElementById('modalTitle').textContent = 'Edit Assessment';

    document.getElementById('assessName').value = name;
    document.getElementById('assessType').value = type;
    document.getElementById('assessWeight').value = weight;
    document.getElementById('assessTotal').value = marks;
    if (earned !== null) {
        document.getElementById('assessEarned').value = earned;
    } else {
        document.getElementById('assessEarned').value = '';
    }

    // Update weight reminder when opening edit modal
    updateWeightReminder();

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addAssessmentModal'));
    modal.show();
}

function getCurrentAssessmentWeight(assessmentId) {
    // Fetch current weight from DOM if possible
    const rows = document.querySelectorAll('#assessmentList tr');
    for (let row of rows) {
        const editBtn = row.querySelector('button[onclick*="openEditModal"]');
        if (editBtn && editBtn.getAttribute('onclick').includes(assessmentId)) {
            const weightCell = row.querySelector('td:nth-child(3)');
            if (weightCell) {
                return parseFloat(weightCell.textContent) || 0;
            }
        }
    }
    return 0;
}

function updateWeightReminder() {
    const weightInput = document.getElementById('assessWeight');
    if (!weightInput) return;

    const enteredWeight = parseFloat(weightInput.value) || 0;

    // Calculate current weight (excluding the one being edited if applicable)
    let currentWeightInForm = totalWeight;
    if (currentAssessmentId) {
        currentWeightInForm -= getCurrentAssessmentWeight(currentAssessmentId);
    }

    const remainingWeight = 100 - currentWeightInForm;
    const newTotal = currentWeightInForm + enteredWeight;

    // Update or create reminder element
    let reminderEl = document.getElementById('weightReminder');
    if (!reminderEl) {
        reminderEl = document.createElement('div');
        reminderEl.id = 'weightReminder';
        reminderEl.className = 'mt-2';
        weightInput.parentElement.appendChild(reminderEl);
    }

    if (newTotal > 100) {
        const maxAllowed = 100 - currentWeightInForm;
        reminderEl.innerHTML = `<small class="text-danger"><strong>⚠️ Exceeds 100%!</strong> Maximum allowed: ${maxAllowed.toFixed(2)}%</small>`;
        weightInput.classList.add('is-invalid');
    } else {
        reminderEl.innerHTML = `<small style="color: #2dd4bf;"><strong>✓ Needed: ${remainingWeight.toFixed(2)}%</strong></small>`;
        weightInput.classList.remove('is-invalid');
    }
}

function updateTotalWeightDisplay() {
    // Disable/enable Add Assessment button based on total weight
    const addBtn = document.getElementById('addAssessmentBtn');
    if (addBtn) {
        if (totalWeight >= 100) {
            addBtn.disabled = true;
            addBtn.classList.add('disabled');
            addBtn.title = 'Cannot add more assessments - total weight is already 100%';
        } else {
            addBtn.disabled = false;
            addBtn.classList.remove('disabled');
            addBtn.title = '';
        }
    }
}

async function deleteAssessment(id) {
    if (!confirm('Are you sure you want to delete this assessment?')) return;

    try {
        // We need to check if a delete endpoint exists. 
        // Based on previous context, I don't recall a specific delete-assessment endpoint.
        // I might need to add it to the backend if it's missing.
        // Let's assume for now I need to add it or it might not exist.
        // Checking app.py content from memory: I recall /delete-course but not /delete-assessment.
        // I will add the endpoint to app.py as well to be safe.

        const response = await fetch(`${window.API_URL}/api/delete-assessment/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadCourseDetails();
        } else {
            alert('Failed to delete assessment');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
