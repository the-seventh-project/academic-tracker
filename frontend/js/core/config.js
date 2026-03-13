const CONFIG = {
    // Use local backend for development; change to Render URL before deploying
    API_URL: window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
        ? 'http://127.0.0.1:5000'
        : 'https://academic-tracker-api-pujq.onrender.com',
    APP_NAME: 'Academic Tracker'
};

// Export for Node.js (Environment variables override in backend, but this might be used for tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG };
}

// Fallback for older scripts not using modules yet
if (typeof window !== 'undefined') {
    window.API_URL = CONFIG.API_URL;
}
