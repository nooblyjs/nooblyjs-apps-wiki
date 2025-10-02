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
                console.log('User activity loaded:', this.app.userActivity);

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
            const response = await fetch('/applications/wiki/api/profile');
            if (response.ok) {
                this.app.userProfile = await response.json();
                this.updateUserProfileUI();
            } else {
                console.warn('Failed to load user profile, using defaults');
                this.app.userProfile = {
                    name: 'Admin User',
                    email: 'admin@example.com',
                    role: 'administrator'
                };
                this.updateUserProfileUI();
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            // Use default profile
            this.app.userProfile = {
                name: 'Admin User',
                email: 'admin@example.com',
                role: 'administrator'
            };
            this.updateUserProfileUI();
        }
    },

    updateUserProfileUI() {
        if (!this.app.userProfile) return;

        // Update header profile
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userInitials = document.getElementById('userInitials');

        if (userName) userName.textContent = this.app.userProfile.name || 'Admin User';
        if (userRole) userRole.textContent = this.capitalizeFirst(this.app.userProfile.role || 'administrator');
        if (userInitials) {
            const initials = this.getInitials(this.app.userProfile.name || 'Admin User');
            userInitials.textContent = initials;
        }

        // Update modal profile
        const profileInitials = document.getElementById('profileInitials');
        if (profileInitials) {
            profileInitials.textContent = this.getInitials(this.app.userProfile.name || 'Admin User');
        }
    },

    getInitials(name) {
        if (!name) return 'AU';
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

        // Show modal
        this.app.showModal('userProfileModal');

        // Bind form events
        this.bindUserProfileEvents();
    },

    bindUserProfileEvents() {
        // Close modal events
        document.getElementById('closeUserProfileModal')?.addEventListener('click', () => {
            this.app.hideModal('userProfileModal');
        });

        document.getElementById('cancelUserProfile')?.addEventListener('click', () => {
            this.app.hideModal('userProfileModal');
        });

        // Form submission
        const form = document.getElementById('userProfileForm');
        if (form) {
            form.removeEventListener('submit', this.handleUserProfileSubmit);
            form.addEventListener('submit', (e) => this.handleUserProfileSubmit(e));
        }

        // Change avatar button (placeholder)
        document.getElementById('changeAvatarBtn')?.addEventListener('click', () => {
            this.app.showNotification('Avatar change feature coming soon!', 'info');
        });
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
                this.app.hideModal('userProfileModal');
                this.app.showNotification('Profile updated successfully!', 'success');
            } else {
                throw new Error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.app.showNotification('Failed to update profile: ' + error.message, 'error');
        }
    },

    // Authentication methods
    async checkAuth() {
        try {
            const response = await fetch('/applications/wiki/api/auth/check');
            const data = await response.json();
            if (data.authenticated) {
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
    },

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/applications/wiki/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (result.success) {
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

    async handleLogout() {
        try {
            await fetch('/applications/wiki/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.showLogin();
        this.app.currentView = 'login';
        this.app.currentSpace = null;
        this.app.currentDocument = null;
    }
}