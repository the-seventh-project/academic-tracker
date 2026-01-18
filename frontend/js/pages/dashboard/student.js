// Student Dashboard Script
// Depends on: core/config.js, core/auth.js, core/utils.js
let currentUser = null;
let courseGrades = []; // populated by calculate-gpa
let allCourses = []; // store all courses for assessment trend analysis
let assessmentTypeTrendChartInstance = null; // store chart instance for updates

// Student Dashboard Controller
// Refactored to use Services and Components.
// Depends on: gpaService.js, GpaChart.js

window.onload = async () => {
    // 1. Auth Check
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '../auth/login.html';
        return;
    }
    const user = JSON.parse(userData);

    // 2. Setup UI
    Auth.updateNavUI('studentName');

    // 3. Set Global User
    currentUser = user;

    // 4. Load Data
    await loadDashboardData(user.id);
};

async function loadDashboardData() {
    await loadWeather();
    await loadGPA();
    await loadCourses();
    // Load all assessment types trend by default
    await loadAllAssessmentTypesTrend();
}

async function loadWeather() {
    try {
        const data = await window.API.get('/api/campus-weather');

        const weatherEl = document.getElementById('weather');
        if (weatherEl) weatherEl.textContent = `${data.temperature}°C, Wind: ${data.windspeed} km/h`;
    } catch (error) {
        const weatherEl = document.getElementById('weather');
        if (weatherEl) weatherEl.textContent = 'Unable to load weather';
        console.error('Weather error:', error);
    }
}

async function loadGPA() {
    try {
        const response = await fetch(`${window.API_URL}/api/calculate-gpa/${currentUser.id}`);
        const data = await response.json();

        // store per-course grades for the courses table
        courseGrades = data.course_grades || [];

        // Fetch courses to calculate semester-by-semester GPA
        const coursesResponse = await fetch(`${window.API_URL}/api/courses/${currentUser.id}`);
        const courses = await coursesResponse.json();

        // Calculate Fall semester GPA on the frontend
        let fallGPA = 0.0;
        let fallGradePoints = 0;
        let fallCredits = 0;

        courses.forEach(course => {
            // Check if semester contains "Fall" (case-insensitive)
            if (course.semester && course.semester.toLowerCase().includes('fall')) {
                // Find GPA for this course from courseGrades
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

        // Update display with Fall GPA for semester and backend cumulative GPA
        const semEl = document.getElementById('semesterGPA');
        const cumEl = document.getElementById('cumulativeGPA');
        if (semEl) semEl.textContent = fallGPA.toFixed(2);
        if (cumEl) cumEl.textContent = data.cumulative_gpa.toFixed(2);

        // Calculate total credits
        const totalCredits = courses.reduce((sum, course) => sum + (Number(course.credit_hours) || 0), 0);
        const creditsEl = document.getElementById('totalCredits');
        if (creditsEl) creditsEl.textContent = totalCredits;

        // Get unique semesters and calculate GPA for each
        const semesterGPAs = calculateSemesterGPAs(courses, courseGrades);

        createGPAChart(semesterGPAs);
    } catch (error) {
        console.error('GPA calculation error:', error);
    }
}

function getCourseGPA(courseCode) {
    if (!courseGrades || !courseGrades.length) return '-';
    const found = courseGrades.find(g => g.course_code === courseCode);
    return found && typeof found.gpa !== 'undefined' ? Number(found.gpa).toFixed(2) : '-';
}

async function loadCourses() {
    try {
        const courses = await window.API.get(`/api/courses/${currentUser.id}`);

        // Store courses globally for assessment trend analysis
        allCourses = courses;

        const tbody = document.getElementById('coursesList');
        if (!tbody) return;

        if (courses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        No courses yet. <a href="../courses/add.html">Add your first course</a>
                    </td>
                </tr>
            `;
            return;
        }

        // Sort courses: first by semester, then by course code
        const semesterOrder = ['Spring', 'Summer', 'Fall', 'Winter'];
        const sortedCourses = courses.sort((a, b) => {
            // Extract year and season from semester
            const [seasonA, yearA] = (a.semester || '').split(' ');
            const [seasonB, yearB] = (b.semester || '').split(' ');

            // Sort by year first
            if (yearA !== yearB) {
                return (yearA || '0').localeCompare(yearB || '0');
            }

            // Then by season
            const indexA = semesterOrder.indexOf(seasonA);
            const indexB = semesterOrder.indexOf(seasonB);
            const semesterCompare = (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);

            // If same semester, sort by course code
            if (semesterCompare !== 0) {
                return semesterCompare;
            }

            // Sort by course code (alphanumeric)
            return (a.course_code || '').localeCompare(b.course_code || '', undefined, { numeric: true });
        });

        tbody.innerHTML = sortedCourses.map(course => `
            <tr>
                <td><strong>${course.course_code}</strong></td>
                <td>${course.course_name}</td>
                <td>${course.credit_hours}</td>
                <td>${course.semester}</td>
                <td>${getCourseGPA(course.course_code)}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-2" onclick="viewCourse(${course.course_id})">
                        View Details
                    </button>
                    <button class="btn btn-sm btn-danger text-white" onclick="deleteCourse(${course.course_id}, '${course.course_code}')">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading courses:', error);
        const tbody = document.getElementById('coursesList');
        if (tbody) tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Error loading courses
                </td>
            </tr>
        `;
    }
}

async function deleteCourse(courseId, courseCode) {
    if (!confirm(`Delete course ${courseCode}? This will remove its assessments.`)) return;
    try {
        await window.API.delete(`/api/delete-course/${courseId}`);
        try { localStorage.setItem('courses_updated', String(Date.now())); } catch (e) { }
        await loadDashboardData();
    } catch (err) {
        alert('Failed to delete course: ' + err.message);
    }
}

function calculateSemesterGPAs(courses, courseGrades) {
    // Group courses by semester
    const semesterMap = {};

    courses.forEach(course => {
        const semester = course.semester || 'Unknown';
        if (!semesterMap[semester]) {
            semesterMap[semester] = {
                courses: [],
                totalPoints: 0,
                totalCredits: 0
            };
        }

        // Find GPA for this course
        const gradeData = courseGrades.find(g => g.course_code === course.course_code);
        const gpa = gradeData && typeof gradeData.gpa !== 'undefined' ? Number(gradeData.gpa) : null;

        if (gpa !== null && course.credit_hours) {
            semesterMap[semester].totalPoints += gpa * course.credit_hours;
            semesterMap[semester].totalCredits += course.credit_hours;
        }
    });

    // Calculate GPA for each semester and sort
    const semesterOrder = ['Spring', 'Summer', 'Fall', 'Winter'];
    const result = Object.entries(semesterMap)
        .map(([semester, data]) => ({
            semester,
            gpa: data.totalCredits > 0 ? data.totalPoints / data.totalCredits : 0
        }))
        .sort((a, b) => {
            // Extract year and season
            const [seasonA, yearA] = a.semester.split(' ');
            const [seasonB, yearB] = b.semester.split(' ');

            // Sort by year first
            if (yearA !== yearB) {
                return (yearA || '0') - (yearB || '0');
            }

            // Then by season
            const indexA = semesterOrder.indexOf(seasonA);
            const indexB = semesterOrder.indexOf(seasonB);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

    return result;
}

function createGPAChart(semesterGPAs) {
    const ctx = document.getElementById('gpaChart');
    if (!ctx) return;

    // Extract labels and data from semesterGPAs
    const labels = semesterGPAs.map(s => s.semester);
    const data = semesterGPAs.map(s => s.gpa);

    // If no data, show a message
    if (labels.length === 0) {
        labels.push('No Data');
        data.push(0);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Semester GPA',
                data: data,
                borderColor: '#bb86fc',
                backgroundColor: 'rgba(187, 134, 252, 0.15)',
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#bb86fc',
                pointBorderColor: '#fff',
                pointBorderWidth: 3,
                pointHoverBackgroundColor: '#03dac6',
                pointHoverBorderColor: '#fff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            animations: {
                y: {
                    duration: 2000,
                    easing: 'easeInOutQuart',
                    delay: (context) => {
                        if (context.type === 'data') {
                            return context.dataIndex * 100 + context.datasetIndex * 80;
                        }
                        return 0;
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#e0e0e0',
                        padding: 15
                    }
                },
                title: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 30, 30, 0.95)',
                    titleColor: '#bb86fc',
                    bodyColor: '#e0e0e0',
                    borderColor: '#bb86fc',
                    borderWidth: 2,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function (context) {
                            return 'GPA: ' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 4.0,
                    ticks: {
                        stepSize: 0.5,
                        color: '#e0e0e0',
                        font: {
                            size: 12
                        }
                    },
                    title: {
                        display: true,
                        text: 'GPA',
                        color: '#bb86fc',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.08)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#e0e0e0',
                        font: {
                            size: 12
                        }
                    },
                    title: {
                        display: true,
                        text: 'Semester',
                        color: '#bb86fc',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    }
                }
            }
        }
    });
}

function viewCourse(courseId) {
    // Open course detail in read-only mode from dashboard
    window.location.href = '../courses/detail.html?id=' + courseId + '&view=1';
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
}

// ============ ASSESSMENT TYPE TREND CHART ============

async function loadAllAssessmentTypesTrend() {
    // Default: Load all assessment types and display overlapping lines
    const assessmentTypes = ['Assignment', 'Quiz', 'Project', 'Midterm', 'Final'];

    try {
        // Fetch data for all assessment types
        const allTypeData = await Promise.all(
            assessmentTypes.map(type => fetchAssessmentsBySemester(type))
        );

        // Combine data for rendering
        const combinedData = assessmentTypes.map((type, index) => ({
            type,
            data: allTypeData[index]
        }));

        // Render chart with all types
        renderAssessmentTypeTrendChart(combinedData, null);
    } catch (error) {
        console.error('Error loading all assessment types trend:', error);
    }
}

async function loadAssessmentTypeTrend() {
    const selector = document.getElementById('assessmentTypeSelector');
    const assessmentType = selector.value;

    if (!assessmentType) {
        // If no selection, show all types (default view)
        await loadAllAssessmentTypesTrend();
        return;
    }

    try {
        // Fetch data for selected type only
        const semesterData = await fetchAssessmentsBySemester(assessmentType);

        // Render chart with single type
        renderAssessmentTypeTrendChart([{ type: assessmentType, data: semesterData }], assessmentType);
    } catch (error) {
        console.error('Error loading assessment type trend:', error);
    }
}

async function fetchAssessmentsBySemester(assessmentType) {
    // Group courses by semester
    const semesterMap = {};

    // Fetch assessments for each course
    for (const course of allCourses) {
        const semester = course.semester || 'Unknown';

        try {
            const assessments = await window.API.get(`/api/assessments/${course.course_id}`);

            // Filter assessments by type
            const filteredAssessments = assessments.filter(a =>
                a.assessment_type === assessmentType
            );

            if (filteredAssessments.length > 0) {
                if (!semesterMap[semester]) {
                    semesterMap[semester] = {
                        totalScore: 0,
                        count: 0,
                        assessments: []
                    };
                }

                // Calculate scores for this semester
                filteredAssessments.forEach(assessment => {
                    if (assessment.marks > 0 && assessment.earned_marks !== null) {
                        const score = (assessment.earned_marks / assessment.marks) * 100;
                        semesterMap[semester].totalScore += score;
                        semesterMap[semester].count += 1;
                        semesterMap[semester].assessments.push(assessment);
                    }
                });
            }
        } catch (error) {
            console.error(`Error fetching assessments for course ${course.course_id}:`, error);
        }
    }

    // Calculate averages and sort by semester
    const semesterOrder = ['Spring', 'Summer', 'Fall', 'Winter'];
    const result = Object.entries(semesterMap)
        .map(([semester, data]) => ({
            semester,
            averageScore: data.count > 0 ? data.totalScore / data.count : null,
            count: data.count
        }))
        .sort((a, b) => {
            // Extract year and season
            const [seasonA, yearA] = a.semester.split(' ');
            const [seasonB, yearB] = b.semester.split(' ');

            // Sort by year first
            if (yearA !== yearB) {
                return (yearA || '0') - (yearB || '0');
            }

            // Then by season
            const indexA = semesterOrder.indexOf(seasonA);
            const indexB = semesterOrder.indexOf(seasonB);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });

    return result;
}

function renderAssessmentTypeTrendChart(typeDataArray, selectedType) {
    const ctx = document.getElementById('assessmentTypeTrendChart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (assessmentTypeTrendChartInstance) {
        assessmentTypeTrendChartInstance.destroy();
    }

    // Color palette for different assessment types (using website color scheme)
    const colorPalette = {
        'Assignment': { border: '#bb86fc', bg: 'rgba(187, 134, 252, 0.15)' },  // Purple
        'Quiz': { border: '#03dac6', bg: 'rgba(3, 218, 198, 0.15)' },  // Teal
        'Exam': { border: '#cf6679', bg: 'rgba(207, 102, 121, 0.15)' },  // Accent pink
        'Lab': { border: '#ff8c00', bg: 'rgba(255, 140, 0, 0.15)' },  // Orange
        'Project': { border: '#ffaf7b', bg: 'rgba(255, 175, 123, 0.15)' },  // Light orange
        'Midterm': { border: '#d76d77', bg: 'rgba(215, 109, 119, 0.15)' },  // Gradient red
        'Final': { border: '#3a1c71', bg: 'rgba(58, 28, 113, 0.15)' }  // Gradient purple
    };

    // Get all unique semesters across all types
    const allSemesters = new Set();
    typeDataArray.forEach(({ data }) => {
        data.forEach(item => allSemesters.add(item.semester));
    });

    // Sort semesters chronologically
    const semesterOrder = ['Spring', 'Summer', 'Fall', 'Winter'];
    const sortedSemesters = Array.from(allSemesters).sort((a, b) => {
        const [seasonA, yearA] = a.split(' ');
        const [seasonB, yearB] = b.split(' ');

        if (yearA !== yearB) {
            return (yearA || '0') - (yearB || '0');
        }

        const indexA = semesterOrder.indexOf(seasonA);
        const indexB = semesterOrder.indexOf(seasonB);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    // Create datasets for each assessment type
    const datasets = typeDataArray.map(({ type, data }) => {
        const colors = colorPalette[type] || { border: '#ff8c00', bg: 'rgba(255, 140, 0, 0.15)' };

        // Map data to match all semesters (fill with null for missing semesters)
        const mappedData = sortedSemesters.map(semester => {
            const found = data.find(d => d.semester === semester);
            return found ? found.averageScore : null;
        });

        return {
            label: type,
            data: mappedData,
            borderColor: colors.border,
            backgroundColor: colors.bg,
            tension: 0.4,
            fill: true, // Fill area for overlapping lines
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: colors.border,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: colors.border,
            pointHoverBorderColor: '#fff',
            borderWidth: 2.5,
            spanGaps: false
        };
    });

    // Handle empty data
    if (sortedSemesters.length === 0) {
        sortedSemesters.push('No Data');
    }

    // Create chart title based on selection
    const chartTitle = selectedType
        ? `${selectedType} Performance Trend`
        : 'Overall Performance Trend';

    // Create new chart
    assessmentTypeTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedSemesters,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            animations: {
                y: {
                    duration: 2000,
                    easing: 'easeInOutQuart',
                    delay: (context) => {
                        if (context.type === 'data') {
                            return context.dataIndex * 100 + context.datasetIndex * 80;
                        }
                        return 0;
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#e0e0e0',
                        padding: 15
                    }
                },
                title: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 30, 30, 0.95)',
                    titleColor: '#ff8c00',
                    bodyColor: '#e0e0e0',
                    borderColor: '#ff8c00',
                    borderWidth: 2,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function (context) {
                            const label = context.dataset.label || '';
                            if (context.parsed.y === null) {
                                return label + ': No data';
                            }
                            return label + ': ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 10,
                        color: '#e0e0e0',
                        font: {
                            size: 12
                        },
                        callback: function (value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Average Score (%)',
                        color: '#ff8c00',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.08)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#e0e0e0',
                        font: {
                            size: 12
                        }
                    },
                    title: {
                        display: true,
                        text: 'Semester',
                        color: '#ff8c00',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

// Export assessment trend data for What-If feature
function getAssessmentTypeTrendData(assessmentType) {
    return fetchAssessmentsBySemester(assessmentType);
}
