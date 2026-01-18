// Forecast Service
// Handles "What-If" scenario calculations via Backend API.

const forecastService = {
    async predictGPA(currentGPA, currentCredits, courses) {
        return window.API.post('/api/forecast/gpa', {
            current_gpa: currentGPA,
            credits_earned: currentCredits,
            courses: courses
        });
    },

    async predictCourseGrade(assessments) {
        return window.API.post('/api/forecast/course-grade', {
            assessments: assessments
        });
    }
};

window.forecastService = forecastService;
