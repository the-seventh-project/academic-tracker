// Forgot Password Page Script
// Depends on: core/config.js (for API_URL)

document.getElementById('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const newPassword = document.getElementById('newPassword').value;

    try {
        const data = await window.API.post('/api/auth/reset-password', {
            email: email,
            newPassword: newPassword
        });

        if (data.success) {
            showSuccess('Password reset successfully!');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showError(data.error || 'Failed to reset password');
        }
    } catch (error) {
        showError(error.message || 'Cannot connect to server');
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
