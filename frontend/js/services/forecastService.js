// Forecast Service
// Handles "What-If" scenario calculations via Backend API.

const forecastService = {
    async predictGPA(currentGPA, currentCredits, courses, targetGPA) {
        return window.API.post('/api/forecast/gpa', {
            current_summary: { cumulative_gpa: currentGPA, total_credits: currentCredits },
            hypothetical_courses: courses,
            target_gpa: targetGPA || null
        });
    },

    async predictCourseGrade(assessments, targetGrade) {
        return window.API.post('/api/forecast/course-grade', {
            assessments: assessments,
            target_grade: targetGrade || null
        });
    }
};

window.forecastService = forecastService;
