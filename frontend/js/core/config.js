const CONFIG = {
    API_URL: 'https://academic-tracker-api-pujq.onrender.com',
    APP_NAME: 'GPA Calculator'
};

// Export for Node.js (Environment variables override in backend, but this might be used for tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG };
}

// Fallback for older scripts not using modules yet
if (typeof window !== 'undefined') {
    window.API_URL = CONFIG.API_URL;
}
