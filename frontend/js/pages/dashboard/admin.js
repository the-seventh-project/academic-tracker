// Admin Overview Page Script
// Depends on: core/config.js, core/auth.js

window.onload = async () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userData);
    if (user.type !== 'Admin') {
        window.location.href = 'student.html';
        return;
    }

    await loadStudents();
};

async function loadStudents() {
    try {
        const students = await window.API.get('/api/admin/students');

        const tbody = document.getElementById('studentList');
        tbody.innerHTML = '';

        for (const student of students) {
            // Fetch GPA for each student
            const gpaData = await window.API.get(`/api/admin/student/${student.user_id}/gpa`);

            // Fetch courses to calculate Fall semester GPA
            const courses = await window.API.get(`/api/courses/${student.user_id}`);

            // Calculate Fall semester GPA on the frontend
            let fallGPA = 0.0;
            let fallGradePoints = 0;
            let fallCredits = 0;

            courses.forEach(course => {
                // Check if semester contains "Fall" (case-insensitive)
                if (course.semester && course.semester.toLowerCase().includes('fall')) {
                    // Find GPA for this course from gpaData.course_grades
                    const courseGrades = gpaData.course_grades || [];
                    const gradeData = courseGrades.find(g => g.course_code === course.course_code);
                    const gpa = gradeData && typeof gradeData.gpa !== 'undefined' ? Number(gradeData.gpa) : null;

                    if (gpa !== null && course.credit_hours) {
                        fallGradePoints += gpa * course.credit_hours;
                        fallCredits += course.credit_hours;
                    }
                }
            });

            // Calculate Fall semester GPA
            if (fallCredits > 0) {
                fallGPA = fallGradePoints / fallCredits;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                    <td>${student.user_id}</td>
                    <td>${student.firstname} ${student.lastname}</td>
                    <td>${student.email}</td>
                    <td>${fallGPA.toFixed(2)} / ${gpaData.cumulative_gpa.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewStudent(${student.user_id}, '${student.firstname} ${student.lastname}')">View Details</button>
                        <button class="btn btn-sm btn-danger ms-2" onclick="deleteStudent(${student.user_id}, '${student.firstname} ${student.lastname}')">Delete</button>
                    </td>
                `;
            tbody.appendChild(tr);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteStudent(studentId, studentName) {
    if (!confirm(`Delete student ${studentName}? This will remove their courses and assessments.`)) return;
    try {
        await window.API.delete(`/api/admin/delete-student/${studentId}`);
        await loadStudents();
    } catch (err) {
        alert('Failed to delete student: ' + err.message);
    }
}

// Show student details modal: GPA and courses
async function viewStudent(studentId, studentName) {
    const title = document.getElementById('adminStudentModalTitle');
    const gpaEl = document.getElementById('adminStudentGPA');
    const tbody = document.getElementById('adminStudentCoursesBody');

    title.textContent = `Student: ${studentName} (#${studentId})`;
    gpaEl.textContent = 'Loading GPA...';
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

    try {
        // fetch GPA
        const gpaData = await window.API.get(`/api/admin/student/${studentId}/gpa`);

        // fetch courses for student
        const courses = await window.API.get(`/api/courses/${studentId}`);

        if (gpaData) {
            // Calculate Fall semester GPA on the frontend
            let fallGPA = 0.0;
            let fallGradePoints = 0;
            let fallCredits = 0;

            courses.forEach(course => {
                // Check if semester contains "Fall" (case-insensitive)
                if (course.semester && course.semester.toLowerCase().includes('fall')) {
                    // Find GPA for this course from gpaData.course_grades
                    const courseGrades = gpaData.course_grades || [];
                    const gradeData = courseGrades.find(g => g.course_code === course.course_code);
                    const gpa = gradeData && typeof gradeData.gpa !== 'undefined' ? Number(gradeData.gpa) : null;

                    if (gpa !== null && course.credit_hours) {
                        fallGradePoints += gpa * course.credit_hours;
                        fallCredits += course.credit_hours;
                    }
                }
            });

            // Calculate Fall semester GPA
            if (fallCredits > 0) {
                fallGPA = fallGradePoints / fallCredits;
            }

            gpaEl.innerHTML = `<strong>GPA (Semester / Cumulative):</strong> ${fallGPA.toFixed(2)} / ${gpaData.cumulative_gpa.toFixed(2)}`;
        } else {
            gpaEl.textContent = 'Unable to load GPA';
        }

        if (!courses || courses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No courses found.</td></tr>';
        } else {
            tbody.innerHTML = courses.map(c => `
                <tr>
                    <td>${c.course_code}</td>
                    <td>${c.course_name}</td>
                    <td class="text-center">${c.credit_hours}</td>
                    <td class="text-center">${c.semester}</td>
                    <td class="text-center"><a class="btn btn-sm btn-primary" style="color: white !important;" href="../courses/detail.html?id=${c.course_id}&from=admin">Open</a></td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading student details', err);
        gpaEl.textContent = 'Error loading details';
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading courses</td></tr>';
    }

    const modal = new bootstrap.Modal(document.getElementById('adminStudentModal'));
    modal.show();
}
