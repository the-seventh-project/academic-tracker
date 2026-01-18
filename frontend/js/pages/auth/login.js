// Login Page Script
// Depends on: core/config.js (for API_URL), core/auth.js (for logout)

// Handle login form submission
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const data = await window.API.post('/api/auth/login', { email, password });

        if (data.user) {
            // Save user data to localStorage
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect based on user type
            if (data.user.type === 'Admin') {
                window.location.href = '../../pages/dashboard/admin.html';
            } else {
                window.location.href = '../../pages/dashboard/student.html';
            }
        } else {
            showError(data.message || 'Invalid credentials');
        }
    } catch (error) {
        showError('Cannot connect to server. Make sure backend is running at ' + window.API_URL);
    }
});

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}
