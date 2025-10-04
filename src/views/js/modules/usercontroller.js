export const userController = {

    init(app) {
        this.app = app;
    },

    // Activity tracking methods
    ensureActivityData() {
        if (!this.app.data.recent) {
            this.app.data.recent = [];
        }
        if (!this.app.data.starred) {
            this.app.data.starred = [];
        }
    },

    async saveActivityToServer() {
        try {
            const response = await fetch('/applications/wiki/api/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recent: this.app.data.recent,
                    starred: this.app.data.starred
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save activity data');
            }
        } catch (error) {
            console.error('Error saving activity to server:', error);
        }
    },

    async loadActivityFromServer() {
        try {
            const response = await fetch('/applications/wiki/api/activity');
            if (response.ok) {
                const data = await response.json();
                this.app.data.recent = data.recent || [];
                this.app.data.starred = data.starred || [];
            }
        } catch (error) {
            console.error('Error loading activity from server:', error);
            this.app.data.recent = [];
            this.app.data.starred = [];
        }
    },

    async loadUserActivity() {
        try {
            // First try to load from our new activity API
            await this.loadActivityFromServer();

            // Then load from the existing user activity API for backward compatibility
            const response = await fetch('/applications/wiki/api/user/activity');
            if (response.ok) {
                this.app.userActivity = await response.json();

                // Always sync userActivity with data to keep them in sync
                if (this.app.userActivity.recent) {
                    this.app.data.recent = this.app.userActivity.recent;
                }

                // Always sync starred data
                if (this.app.userActivity.starred) {
                    this.app.data.starred = this.app.userActivity.starred;
                }
            } else {
                console.warn('Failed to load user activity, using defaults');
                this.app.userActivity = {
                    starred: [],
                    recent: []
                };
            }
        } catch (error) {
            console.error('Error loading user activity:', error);
            this.app.userActivity = {
                starred: [],
                recent: []
            };
        }
    },

    // User Profile Management
    async loadUserProfile() {
        try {
            console.log('Loading user profile...');
            const response = await fetch('/applications/wiki/api/profile');
            console.log('Profile API response status:', response.status);

            if (response.ok) {
                this.app.userProfile = await response.json();
                console.log('User profile loaded:', this.app.userProfile);
                this.updateUserProfileUI();
            } else {
                const errorText = await response.text();
                console.error('Failed to load user profile:', response.status, errorText);
                console.warn('Using fallback profile');
                // Use a minimal fallback - the API should create the profile on first access
                this.app.userProfile = {
                    name: 'User',
                    email: 'user@example.com',
                    role: 'administrator'
                };
                this.updateUserProfileUI();
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            // Use minimal fallback profile
            this.app.userProfile = {
                name: 'User',
                email: 'user@example.com',
                role: 'administrator'
            };
            this.updateUserProfileUI();
        }
    },

    updateUserProfileUI() {
        if (!this.app.userProfile) return;

        // Update header profile text
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userInitials = document.getElementById('userInitials');

        if (userName) userName.textContent = this.app.userProfile.name || 'User';
        if (userRole) userRole.textContent = this.capitalizeFirst(this.app.userProfile.role || 'administrator');

        // Update header avatar
        const headerAvatarImage = document.getElementById('headerAvatarImage');
        const headerAvatarInitials = document.getElementById('headerAvatarInitials');

        if (this.app.userProfile.avatar) {
            // Show avatar image in header, hide initials
            if (headerAvatarImage) {
                headerAvatarImage.src = this.app.userProfile.avatar;
                headerAvatarImage.classList.remove('hidden');
            }
            if (headerAvatarInitials) {
                headerAvatarInitials.classList.add('hidden');
            }
        } else {
            // Show initials in header, hide avatar image
            if (headerAvatarImage) {
                headerAvatarImage.classList.add('hidden');
            }
            if (headerAvatarInitials) {
                headerAvatarInitials.classList.remove('hidden');
            }
            if (userInitials) {
                const initials = this.getInitials(this.app.userProfile.name || 'User');
                userInitials.textContent = initials;
            }
        }

        // Update profile page avatar
        const profileAvatarImage = document.getElementById('profileAvatarImage');
        const profileAvatarInitials = document.getElementById('profileAvatarInitials');
        const profileInitials = document.getElementById('profileInitials');

        if (this.app.userProfile.avatar) {
            // Show avatar image, hide initials
            if (profileAvatarImage) {
                profileAvatarImage.src = this.app.userProfile.avatar;
                profileAvatarImage.classList.remove('hidden');
            }
            if (profileAvatarInitials) {
                profileAvatarInitials.classList.add('hidden');
            }
        } else {
            // Show initials, hide avatar image
            if (profileAvatarImage) {
                profileAvatarImage.classList.add('hidden');
            }
            if (profileAvatarInitials) {
                profileAvatarInitials.classList.remove('hidden');
            }
            if (profileInitials) {
                profileInitials.textContent = this.getInitials(this.app.userProfile.name || 'User');
            }
        }
    },

    getInitials(name) {
        if (!name) return 'U';
        return name.split(' ')
                   .map(part => part.charAt(0))
                   .join('')
                   .toUpperCase()
                   .substring(0, 2);
    },

    capitalizeFirst(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    },

    showUserProfileModal() {
        if (!this.app.userProfile) {
            this.app.showNotification('User profile not loaded', 'error');
            return;
        }

        // Populate form with current profile data
        document.getElementById('profileName').value = this.app.userProfile.name || '';
        document.getElementById('profileEmail').value = this.app.userProfile.email || '';
        document.getElementById('profileRole').value = this.app.userProfile.role || 'administrator';
        document.getElementById('profileBio').value = this.app.userProfile.bio || '';
        document.getElementById('profileLocation').value = this.app.userProfile.location || '';
        document.getElementById('profileTimezone').value = this.app.userProfile.timezone || 'UTC';

        // Set preferences
        document.getElementById('emailNotifications').checked = this.app.userProfile.preferences?.emailNotifications ?? true;
        document.getElementById('darkMode').checked = this.app.userProfile.preferences?.darkMode ?? false;
        document.getElementById('defaultLanguage').value = this.app.userProfile.preferences?.defaultLanguage || 'en';

        // Update profile initials
        const profileInitials = document.getElementById('profileInitials');
        if (profileInitials) {
            profileInitials.textContent = this.getInitials(this.app.userProfile.name || 'User');
        }

        // Show profile view
        this.app.setActiveView('profile');

        // Bind form events
        this.bindUserProfileEvents();
    },

    bindUserProfileEvents() {
        // Cancel button - go back to home
        const cancelBtn = document.getElementById('cancelUserProfile');
        if (cancelBtn) {
            cancelBtn.replaceWith(cancelBtn.cloneNode(true)); // Remove old listeners
            document.getElementById('cancelUserProfile').addEventListener('click', () => {
                this.app.showHome();
            });
        }

        // Form submission
        const form = document.getElementById('userProfileForm');
        if (form) {
            form.replaceWith(form.cloneNode(true)); // Remove old listeners
            const newForm = document.getElementById('userProfileForm');
            newForm.addEventListener('submit', (e) => this.handleUserProfileSubmit.call(this, e));
        }

        // Change avatar button
        const avatarBtn = document.getElementById('changeAvatarBtn');
        if (avatarBtn) {
            avatarBtn.replaceWith(avatarBtn.cloneNode(true)); // Remove old listeners
            document.getElementById('changeAvatarBtn').addEventListener('click', () => {
                this.showAvatarUploadModal();
            });
        }

        // Password change form
        const passwordForm = document.getElementById('changePasswordForm');
        if (passwordForm) {
            passwordForm.replaceWith(passwordForm.cloneNode(true)); // Remove old listeners
            const newPasswordForm = document.getElementById('changePasswordForm');
            newPasswordForm.addEventListener('submit', (e) => this.handlePasswordChange.call(this, e));
        }
    },

    async handleUserProfileSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const profileData = {
            name: formData.get('profileName'),
            email: formData.get('profileEmail'),
            role: formData.get('profileRole'),
            bio: formData.get('profileBio'),
            location: formData.get('profileLocation'),
            timezone: formData.get('profileTimezone'),
            preferences: {
                emailNotifications: formData.has('emailNotifications'),
                darkMode: formData.has('darkMode'),
                defaultLanguage: formData.get('defaultLanguage')
            }
        };

        try {
            const response = await fetch('/applications/wiki/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            const result = await response.json();

            if (result.success) {
                this.app.userProfile = result.profile;
                this.updateUserProfileUI();
                this.app.showHome();
                this.app.showNotification('Profile updated successfully!', 'success');
            } else {
                throw new Error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.app.showNotification('Failed to update profile: ' + error.message, 'error');
        }
    },

    async handlePasswordChange(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmNewPassword = formData.get('confirmNewPassword');

        // Only proceed if all password fields are filled
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            this.app.showNotification('Please fill in all password fields', 'error');
            return;
        }

        // Validate passwords match
        if (newPassword !== confirmNewPassword) {
            this.app.showNotification('New passwords do not match', 'error');
            return;
        }

        // Validate password length
        if (newPassword.length < 6) {
            this.app.showNotification('Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            const response = await fetch('/applications/wiki/api/profile/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const result = await response.json();

            if (result.success) {
                this.app.showNotification('Password changed successfully!', 'success');
                // Clear the form
                e.target.reset();
            } else {
                throw new Error(result.error || 'Failed to change password');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.app.showNotification('Failed to change password: ' + error.message, 'error');
        }
    },

    // Avatar upload methods
    showAvatarUploadModal() {
        this.app.showModal('avatarUploadModal');

        // Reset file input
        const fileInput = document.getElementById('avatarFileInput');
        if (fileInput) fileInput.value = '';

        // Hide crop container
        const cropContainer = document.getElementById('avatarCropContainer');
        if (cropContainer) cropContainer.classList.add('hidden');

        const saveBtn = document.getElementById('saveAvatarBtn');
        if (saveBtn) saveBtn.classList.add('hidden');

        // Bind event listeners
        this.bindAvatarModalEvents();
    },

    bindAvatarModalEvents() {
        const fileInput = document.getElementById('avatarFileInput');
        const closeBtn = document.getElementById('closeAvatarModal');
        const cancelBtn = document.getElementById('cancelAvatarUpload');
        const saveBtn = document.getElementById('saveAvatarBtn');

        // File input change
        if (fileInput) {
            fileInput.replaceWith(fileInput.cloneNode(true));
            document.getElementById('avatarFileInput').addEventListener('change', (e) => this.handleAvatarFileSelect(e));
        }

        // Close button
        if (closeBtn) {
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            document.getElementById('closeAvatarModal').addEventListener('click', () => {
                this.closeAvatarModal();
            });
        }

        // Cancel button
        if (cancelBtn) {
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            document.getElementById('cancelAvatarUpload').addEventListener('click', () => {
                this.closeAvatarModal();
            });
        }

        // Save button
        if (saveBtn) {
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            document.getElementById('saveAvatarBtn').addEventListener('click', () => this.saveAvatar());
        }
    },

    handleAvatarFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.match('image.*')) {
            this.app.showNotification('Please select an image file', 'error');
            return;
        }

        // Read file and show cropper
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.getElementById('avatarImageToCrop');
            img.src = event.target.result;

            // Show crop container and save button
            document.getElementById('avatarCropContainer').classList.remove('hidden');
            document.getElementById('saveAvatarBtn').classList.remove('hidden');

            // Destroy existing cropper if any
            if (this.cropper) {
                this.cropper.destroy();
            }

            // Initialize cropper
            this.cropper = new Cropper(img, {
                aspectRatio: 1,
                viewMode: 2,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: false,
                cropBoxResizable: false,
                toggleDragModeOnDblclick: false
            });
        };
        reader.readAsDataURL(file);
    },

    async saveAvatar() {
        if (!this.cropper) {
            this.app.showNotification('No image to save', 'error');
            return;
        }

        try {
            // Get cropped canvas
            const canvas = this.cropper.getCroppedCanvas({
                width: 200,
                height: 200,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });

            // Convert to blob
            canvas.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('avatar', blob, 'avatar.png');

                try {
                    const response = await fetch('/applications/wiki/api/profile/avatar', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Update profile with new avatar URL
                        this.app.userProfile.avatar = result.avatarUrl;
                        this.updateUserProfileUI();
                        this.app.showNotification('Avatar updated successfully!', 'success');
                        this.closeAvatarModal();
                    } else {
                        throw new Error(result.error || 'Failed to upload avatar');
                    }
                } catch (error) {
                    console.error('Error uploading avatar:', error);
                    this.app.showNotification('Failed to upload avatar: ' + error.message, 'error');
                }
            }, 'image/png');
        } catch (error) {
            console.error('Error saving avatar:', error);
            this.app.showNotification('Failed to save avatar: ' + error.message, 'error');
        }
    },

    closeAvatarModal() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        this.app.hideModal('avatarUploadModal');
    },

    // Authentication methods
    async checkAuth() {
        try {
            const response = await fetch('/api/auth/check');
            const data = await response.json();
            if (data.authenticated) {
                // Check if user needs to complete wizard
                if (data.needsWizard) {
                    window.location.href = '/wizard';
                    return;
                }
                await this.app.loadInitialData();
                this.app.showHome();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLogin();
        }
    },

    showLogin() {
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('wikiApp').classList.add('hidden');
        this.setupAuthToggle();
    },

    setupAuthToggle() {
        const toggleLink = document.getElementById('toggleAuthMode');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        let isLoginMode = true;

        if (toggleLink) {
            toggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                isLoginMode = !isLoginMode;

                if (isLoginMode) {
                    loginForm.classList.remove('hidden');
                    registerForm.classList.add('hidden');
                    toggleLink.innerHTML = '<small>Don\'t have an account? <span class="text-primary fw-bold">Register</span></small>';
                } else {
                    loginForm.classList.add('hidden');
                    registerForm.classList.remove('hidden');
                    toggleLink.innerHTML = '<small>Already have an account? <span class="text-primary fw-bold">Login</span></small>';
                }
            });
        }
    },

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: username, password })
            });

            const result = await response.json();

            if (result.success) {
                // Check if user needs to complete wizard
                if (result.needsWizard) {
                    window.location.href = '/wizard';
                    return;
                }

                document.getElementById('loginPage').classList.add('hidden');
                document.getElementById('wikiApp').classList.remove('hidden');
                await this.app.loadInitialData();
                this.app.showHome();
            } else {
                document.getElementById('loginError').textContent = result.message || 'Login failed';
                document.getElementById('loginError').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            document.getElementById('loginError').textContent = 'Login failed';
            document.getElementById('loginError').classList.remove('hidden');
        }
    },

    async handleRegister() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        // Validate passwords match
        if (password !== passwordConfirm) {
            document.getElementById('registerError').textContent = 'Passwords do not match';
            document.getElementById('registerError').classList.remove('hidden');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            if (result.success) {
                // Registration successful, redirect to wizard
                window.location.href = '/wizard';
            } else {
                document.getElementById('registerError').textContent = result.message || 'Registration failed';
                document.getElementById('registerError').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Registration error:', error);
            document.getElementById('registerError').textContent = 'Registration failed';
            document.getElementById('registerError').classList.remove('hidden');
        }
    },

    async handleLogout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.showLogin();
        this.app.currentView = 'login';
        this.app.currentSpace = null;
        this.app.currentDocument = null;
    }
}