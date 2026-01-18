// Shared Authentication Utilities
const Auth = {
    /**
     * Get the logged in user from localStorage
     */
    getUser() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    },

    /**
     * Get user ID (handles different field names from backend)
     */
    getUserId() {
        const user = this.getUser();
        if (!user) return null;
        return user.id ?? user.user_id ?? user.userId ?? null;
    },

    /**
     * Check if a user is logged in
     */
    isLoggedIn() {
        return !!this.getUser();
    },

    /**
     * Redirect to login if not authenticated
     */
    requireLogin() {
        if (!this.isLoggedIn()) {
            // Assumes running from a page in frontend/pages/subcategory/
            window.location.href = '../auth/login.html';
            return false;
        }
        return true;
    },

    /**
     * Logout utility - clears storage and redirects
     */
    logout() {
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    },

    /**
     * Update navigation with user info
     */
    updateNavUI(nameElementId = 'studentName') {
        const user = this.getUser();
        const el = document.getElementById(nameElementId);
        if (el && user && user.name) {
            el.textContent = user.name;
            el.style.cursor = 'pointer';
            el.title = "Click to view profile";

            // Direct assignment avoids duplicate listener issues and cloning bugs
            el.onclick = () => {
                const path = window.location.pathname;
                // If we are deep in pages/dashboard/ or pages/tools/, handle relative path
                if (path.includes('/dashboard/')) {
                    window.location.href = '../tools/profile.html';
                } else if (path.includes('/tools/')) {
                    window.location.href = 'profile.html';
                } else {
                    // Fallback
                    window.location.href = 'pages/tools/profile.html';
                }
            };
        }
    }
};

// Expose to window for inline onclick handlers
if (typeof window !== 'undefined') {
    window.Auth = Auth;
    window.logout = function () { Auth.logout(); };
}
