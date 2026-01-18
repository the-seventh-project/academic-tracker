// Add Course Page Script
// Depends on: core/config.js, core/auth.js

let currentUser = null;

window.onload = () => {
    if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = Auth.getUser();
};

// Handle add course form
document.getElementById('addCourseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const courseCode = document.getElementById('courseCode').value.trim();
    const courseName = document.getElementById('courseName').value;
    const creditHours = parseFloat(document.getElementById('creditHours').value);
    const semester = document.getElementById('semester').value;

    // Check if course code already exists
    try {
        const existingCourses = await window.API.get(`/api/courses/${currentUser.id}`);
        const duplicateCourse = existingCourses.find(
            course => course.course_code.toLowerCase() === courseCode.toLowerCase()
        );

        if (duplicateCourse) {
            alert(`Course code "${courseCode}" already exists!\nCourse: ${duplicateCourse.course_name}\n\nPlease use a different course code.`);
            return;
        }
    } catch (error) {
        console.error('Error checking for duplicate course:', error);
    }

    const courseData = {
        course_code: courseCode,
        course_name: courseName,
        credit_hours: creditHours,
        semester: semester,
        student_id: currentUser.id
    };

    try {
        const data = await window.API.post('/api/add-course', courseData);

        if (data.success) {
            showSuccess('Course added successfully!');
            setTimeout(() => {
                window.location.href = '../dashboard/student.html';
            }, 1500);
        } else {
            showError('Failed to add course');
        }
    } catch (error) {
        showError('Cannot connect to server');
    }
});

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}
