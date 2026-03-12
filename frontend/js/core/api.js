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

            // Guard JSON parse — Render (free tier) can return HTML on cold-start/503
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                // Non-JSON response (HTML error page, gateway timeout, etc.)
                const hint = (mergedOptions.method === 'POST' || mergedOptions.method === 'PUT')
                    ? ' If you just submitted data, check your dashboard — it may still have been saved.'
                    : '';
                throw new Error(`Server returned an unexpected response (HTTP ${response.status}).${hint}`);
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || `Request failed (HTTP ${response.status})`);
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
