// Add Course Page Script
// Depends on: core/config.js, core/auth.js, core/utils.js

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

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

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
            if (submitBtn) submitBtn.disabled = false;
            Notify.warning(`Course code "${courseCode}" already exists (${duplicateCourse.course_name}). Please use a different code.`);
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
            Notify.success('Course added successfully! Redirecting...');
            setTimeout(() => {
                window.location.href = '../dashboard/student.html';
            }, 1500);
        } else {
            if (submitBtn) submitBtn.disabled = false;
            Notify.error(data.error || 'Failed to add course. Please try again.');
        }
    } catch (error) {
        if (submitBtn) submitBtn.disabled = false;
        Notify.error(error.message || 'Could not reach the server. Please check your connection and try again.');
    }
});
