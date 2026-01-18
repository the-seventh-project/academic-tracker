// Account Information Page Script
// Depends on: core/config.js, core/auth.js

window.onload = async () => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '../auth/login.html';
        return;
    }

    const user = JSON.parse(userData);

    // Display student name in navbar
    const studentNameEl = document.getElementById('studentName');
    if (studentNameEl && user.name) {
        studentNameEl.textContent = user.name;
        // Make name clickable to return to this page
        studentNameEl.style.cursor = 'pointer';
        studentNameEl.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }

    // Populate read-only fields from user object
    const firstNameEl = document.getElementById('firstName');
    const lastNameEl = document.getElementById('lastName');
    const emailEl = document.getElementById('studentEmail');

    // Split name into first and last (assuming format: "First Last")
    let firstName = '';
    let lastName = '';
    if (user.name) {
        const nameParts = user.name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
        if (firstNameEl) firstNameEl.value = firstName;
        if (lastNameEl) lastNameEl.value = lastName;

        // Update welcome header
        const welcomeHeader = document.getElementById('welcomeHeader');
        if (welcomeHeader) {
            welcomeHeader.textContent = `Hello ${firstName} ${lastName}!`;
        }
    }

    if (emailEl && user.email) {
        emailEl.value = user.email;
    }

    // Load saved editable information - try API first, then localStorage fallback
    try {
        const profileData = await window.API.get(`/api/students/${user.id}/profile`);
        if (profileData.success) {
            document.getElementById('studentId').value = profileData.student_id || '';
            document.getElementById('major').value = profileData.major || '';
            document.getElementById('level').value = profileData.level || '';
        }
    } catch (error) {
        console.warn('Could not load profile from API, using localStorage:', error);
        loadFromLocalStorage();
    }

    function loadFromLocalStorage() {
        const savedInfo = localStorage.getItem('studentInfo');
        if (savedInfo) {
            const info = JSON.parse(savedInfo);
            document.getElementById('studentId').value = info.studentId || '';
            document.getElementById('major').value = info.major || '';
            document.getElementById('level').value = info.level || '';
        }
    }

    // Load GPA and courses from API
    await loadProgressReport(user.id);

    // Save button handler
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveInformation);
    }
};

async function loadProgressReport(userId) {
    try {
        // Fetch GPA data
        const gpaData = await window.API.get(`/api/calculate-gpa/${userId}`);
        const cumulativeGPAEl = document.getElementById('cumulativeGPA');
        if (cumulativeGPAEl && gpaData.cumulative_gpa !== null && gpaData.cumulative_gpa !== undefined) {
            cumulativeGPAEl.textContent = Number(gpaData.cumulative_gpa).toFixed(2);
        }
        // Store course grades for lookup
        const courseGrades = gpaData.course_grades || [];

        // Fetch courses
        const courses = await window.API.get(`/api/courses/${userId}`);
        renderCourses(courses, courseGrades);
    } catch (error) {
        console.error('Error loading progress report:', error);
    }
}

function renderCourses(courses, courseGrades) {
    const tbody = document.getElementById('coursesList');
    if (!tbody) return;

    if (!courses || courses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No courses yet.</td></tr>';
        return;
    }

    tbody.innerHTML = courses.map(course => {
        // Find matching GPA from course_grades array
        let gpa = '-';
        if (courseGrades && courseGrades.length > 0) {
            const gradeData = courseGrades.find(g => g.course_code === course.course_code);
            if (gradeData && typeof gradeData.gpa !== 'undefined') {
                gpa = Number(gradeData.gpa).toFixed(2);
            }
        }

        return `
            <tr>
                <td>${course.course_name || '-'}</td>
                <td class="text-center">${course.course_code || '-'}</td>
                <td class="text-center">${course.credit_hours || '-'}</td>
                <td class="text-center">${gpa}</td>
            </tr>
        `;
    }).join('');
}

async function saveInformation() {
    const studentId = document.getElementById('studentId').value.trim();
    const major = document.getElementById('major').value.trim();
    const level = document.getElementById('level').value.trim();

    // Basic validation
    if (!studentId || !major || !level) {
        showMessage('Please fill in all fields.', 'danger');
        return;
    }

    // Get user ID
    const userData = localStorage.getItem('user');
    if (!userData) {
        showMessage('Not logged in.', 'danger');
        return;
    }
    const user = JSON.parse(userData);

    // Save to localStorage as backup
    const studentInfo = { studentId, major, level };
    localStorage.setItem('studentInfo', JSON.stringify(studentInfo));

    // Try to save to API
    try {
        const result = await window.API.put(`/api/students/${user.id}/profile`, {
            student_id: studentId,
            major: major,
            level: level
        });

        if (result.success) {
            showMessage('Information saved successfully!', 'success');
        } else {
            showMessage('Saved locally. Server: ' + (result.error || 'Unknown error'), 'warning');
        }
    } catch (error) {
        console.warn('Could not save to API:', error);
        showMessage('Saved locally (server unavailable).', 'warning');
    }
}

function showMessage(message, type) {
    const messageEl = document.getElementById('saveMessage');
    if (!messageEl) return;

    messageEl.className = `alert alert-${type} mt-3`;
    messageEl.textContent = message;
    messageEl.style.display = 'block';

    // Hide message after 3 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
}
