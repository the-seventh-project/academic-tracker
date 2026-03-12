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

        // Default 15s timeout, allows override (e.g., 30s for POST)
        const controller = new AbortController();
        const timeoutMs = options.timeout || 15000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        mergedOptions.signal = controller.signal;

        try {
            const response = await fetch(url, mergedOptions);
            clearTimeout(timeoutId);

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                throw new Error(`Server returned an unexpected response (HTTP ${response.status}). The server may be starting up — please try again in a moment.`);
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || `Request failed (HTTP ${response.status})`);
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. The server may be starting up — please wait a moment and try again.');
            }
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    },

    /**
     * Wrapper that retries on failure with exponential backoff.
     * Useful for cold-start scenarios where the first request may fail.
     */
    async fetchWithRetry(endpoint, options = {}, maxRetries = 2) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.fetch(endpoint, options);
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
        }
    },

    /**
     * GET request helper (uses retry for cold-start resilience)
     */
    async get(endpoint) {
        return this.fetchWithRetry(endpoint, { method: 'GET' });
    },

    /**
     * POST request helper
     * Uses a longer timeout rather than retrying, because POSTs are not idempotent
     */
    async post(endpoint, body) {
        return this.fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
            timeout: 30000
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
