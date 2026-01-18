// Config Service
// Fetches dynamic system configuration (Assessment Types, Semesters, etc.)

const configService = {
    _cachedTypes: null,

    /**
     * Fetch assessment types from backend.
     * @returns {Promise<Array>} List of types [{ name, default_weight, color }]
     */
    async getAssessmentTypes() {
        return window.API.get('/api/config/assessment-types');
    }
};

window.configService = configService;
