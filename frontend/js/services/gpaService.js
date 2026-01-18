// GPA and Course Service
// Handles fetching GPA breakdowns, grading scales, and course data.

const gpaService = {
    /**
     * Get the global grading scale configuration.
     * @returns {Promise<Array>} List of grading scale entries.
     */
    async getGradingScale() {
        return window.API.get('/api/config/grading-scale');
    },

    /**
     * Get detailed GPA breakdown by semester for a student.
     * Replaces client-side calculation logic.
     * @param {number} studentId 
     * @returns {Promise<Object>} { semesters: [], cumulative_gpa: number }
     */
    async getBreakdown(studentId) {
        return window.API.get(`/api/gpa/${studentId}/breakdown`);
    },

    /**
     * Get legacy summary (cumulative only).
     * @param {number} studentId 
     */
    async getSummary(studentId) {
        return window.API.get(`/api/calculate-gpa/${studentId}`);
    }
};


// Expose to window for now (until we use modules/bundler)
window.gpaService = gpaService;
