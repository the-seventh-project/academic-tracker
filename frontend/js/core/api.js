// Shared API Utilities
const API = {
    /**
     * Wrapper for fetch that returns JSON and handles errors
     * @param {string} endpoint - The API endpoint (e.g., '/login')
     * @param {object} options - Fetch options
     */
    async fetch(endpoint, options = {}) {
        const baseUrl = window.API_URL || 'http://127.0.0.1:5000';
        const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, mergedOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP Error ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    },

    /**
     * GET request helper
     */
    async get(endpoint) {
        return this.fetch(endpoint, { method: 'GET' });
    },

    /**
     * POST request helper
     */
    async post(endpoint, body) {
        return this.fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    /**
     * PUT request helper
     */
    async put(endpoint, body) {
        return this.fetch(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    /**
     * DELETE request helper
     */
    async delete(endpoint) {
        return this.fetch(endpoint, { method: 'DELETE' });
    }
};

// Expose to window
if (typeof window !== 'undefined') {
    window.API = API;
}
