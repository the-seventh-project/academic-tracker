// Register Page Script
// Depends on: core/config.js (for API_URL)

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstname = document.getElementById('firstname').value;
    const lastname = document.getElementById('lastname').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const payload = { firstname, lastname, email, password };

    try {
        const data = await window.API.post('/api/auth/register', payload);

        if (data.success) {
            showSuccess('Registration successful! Redirecting...');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        } else {
            showError(data.error || 'Failed to register');
        }
    } catch (error) {
        showError(error.message || 'Cannot connect to server');
        console.error(error);
    }
});

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}
