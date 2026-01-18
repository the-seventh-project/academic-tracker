const CONFIG = {
    API_URL: 'http://127.0.0.1:5000',
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
