// Use localhost for development, otherwise use the production URL
// IMPORTANT: Replace 'https://your-render-app-name.onrender.com' with your actual Render URL after deploying the backend
const API_URL = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
    ? 'http://127.0.0.1:5000'
    : 'https://academic-tracker-1mot.onrender.com';

// Handle login form submission
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Save user data to localStorage
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect based on user type
            if (data.user.type === 'Admin') {
                window.location.href = 'admin-overview.html';
            } else {
                // After successful student login, go directly to the student main page
                window.location.href = 'student-dashboard.html';
            }
        } else {
            showError(data.message || 'Invalid credentials');
        }
    } catch (error) {
        showError('Cannot connect to server. Make sure backend is running at ' + API_URL);
    }
});

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    // Hide error after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}
