// Login page JavaScript
class LoginApp {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.rememberMeCheckbox = document.getElementById('rememberMe');
        this.loginButton = document.getElementById('loginButton');
        this.btnText = this.loginButton.querySelector('.btn-text');
        this.btnSpinner = this.loginButton.querySelector('.btn-spinner');
        this.errorMessage = document.getElementById('errorMessage');
        this.successMessage = document.getElementById('successMessage');
        this.errorText = document.getElementById('errorText');
        this.successText = document.getElementById('successText');

        this.setupEventListeners();
        this.checkExistingAuth();
        this.handleUrlParams();
    }

    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Enter key handling
        [this.usernameInput, this.passwordInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleLogin();
                }
            });
        });

        // Clear errors when user starts typing
        [this.usernameInput, this.passwordInput].forEach(input => {
            input.addEventListener('input', () => {
                this.hideMessages();
            });
        });

        // Auto-focus username field
        this.usernameInput.focus();
    }

    async checkExistingAuth() {
        try {
            const response = await fetch('/applications/blog/api/auth/check');
            const data = await response.json();

            if (data.authenticated) {
                // User is already logged in, redirect to admin
                window.location.href = '/applications/blog/admin/stories';
            }
        } catch (error) {
            console.log('Auth check failed:', error);
            // Continue with login form
        }
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const message = urlParams.get('message');

        if (error === 'access_denied') {
            this.showError('Access denied. Admin privileges required.');
        } else if (error === 'session_expired') {
            this.showError('Your session has expired. Please log in again.');
        } else if (message === 'logout') {
            this.showSuccess('You have been logged out successfully.');
            setTimeout(() => this.hideMessages(), 3000);
        }
    }

    async handleLogin() {
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value;
        const rememberMe = this.rememberMeCheckbox.checked;

        // Validation
        if (!username || !password) {
            this.showError('Please enter both username and password.');
            return;
        }

        this.setLoading(true);
        this.hideMessages();

        try {
            const response = await fetch('/applications/blog/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    rememberMe
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Login successful! Redirecting...');

                // Record login activity
                this.recordLoginActivity(username);

                // Redirect after short delay
                setTimeout(() => {
                    const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/applications/blog/admin/stories';
                    window.location.href = redirectUrl;
                }, 1500);
            } else {
                this.showError(data.error || 'Login failed. Please try again.');
                this.setLoading(false);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please check your connection and try again.');
            this.setLoading(false);
        }
    }

    async recordLoginActivity(username) {
        try {
            // Record login timestamp for analytics
            const loginData = {
                username,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                ip: 'client' // Server will capture actual IP
            };

            // Store in localStorage for client-side tracking
            const recentLogins = JSON.parse(localStorage.getItem('blog_recent_logins') || '[]');
            recentLogins.unshift(loginData);

            // Keep only last 10 login records
            if (recentLogins.length > 10) {
                recentLogins.splice(10);
            }

            localStorage.setItem('blog_recent_logins', JSON.stringify(recentLogins));
        } catch (error) {
            console.log('Error recording login activity:', error);
        }
    }

    setLoading(loading) {
        this.loginButton.disabled = loading;
        this.form.classList.toggle('loading', loading);

        if (loading) {
            this.btnSpinner.classList.remove('hidden');
        } else {
            this.btnSpinner.classList.add('hidden');
        }
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.classList.remove('hidden');
        this.successMessage.classList.add('hidden');

        // Scroll error into view
        this.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showSuccess(message) {
        this.successText.textContent = message;
        this.successMessage.classList.remove('hidden');
        this.errorMessage.classList.add('hidden');
    }

    hideMessages() {
        this.errorMessage.classList.add('hidden');
        this.successMessage.classList.add('hidden');
    }
}

// Password toggle functionality
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('passwordToggleIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// Initialize the login app
let loginApp;
document.addEventListener('DOMContentLoaded', () => {
    loginApp = new LoginApp();
});

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
    loginApp.checkExistingAuth();
});

// Auto-fill demo credentials for development
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+D to auto-fill demo credentials
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        document.getElementById('username').value = 'admin';
        document.getElementById('password').value = 'admin123';
        e.preventDefault();
    }
});