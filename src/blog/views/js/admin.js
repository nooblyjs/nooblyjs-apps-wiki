document.addEventListener('DOMContentLoaded', () => {
    const postsTable = document.querySelector('#posts-table tbody');
    const commentsTable = document.querySelector('#comments-table tbody');
    const createPostBtn = document.getElementById('create-post-btn');
    const loginModal = document.getElementById('loginModal');

    const API_URL = '/applications/blog/api/admin';
    let isAuthenticated = false;

    // Show login modal
    function showLoginModal() {
        loginModal.style.display = 'flex';
    }

    // Close login modal
    function closeLoginModal() {
        loginModal.style.display = 'none';
    }

    // Login
    async function login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/applications/blog/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (data.success) {
                isAuthenticated = true;
                closeLoginModal();
                alert('Login successful!');
                loadPosts();
                loadComments();
            } else {
                alert('Login failed: ' + data.message);
            }
        } catch (error) {
            alert('Login error: ' + error.message);
        }
    }

    // Check auth status
    async function checkAuth() {
        try {
            const response = await fetch('/applications/blog/api/auth/check');
            const data = await response.json();
            isAuthenticated = data.authenticated;
            if (isAuthenticated) {
                loadPosts();
                loadComments();
            } else {
                showLoginModal();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            showLoginModal();
        }
    }

    // Fetch and display posts
    async function loadPosts() {
        try {
            const response = await fetch(`${API_URL}/posts`);
            if(response.status === 401) {
                showLoginModal();
                return;
            }
            const posts = await response.json();
            postsTable.innerHTML = '';
            posts.forEach(post => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${post.title}</td>
                    <td>${post.author ? post.author.displayName : 'N/A'}</td>
                    <td>${post.category ? post.category.name : 'N/A'}</td>
                    <td>${post.status}</td>
                    <td class="actions">
                        <button class="edit-btn" data-id="${post.id}">Edit</button>
                        <button class="delete-btn" data-id="${post.id}">Delete</button>
                    </td>
                `;
                postsTable.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading posts:', error);
        }
    }

    // Fetch and display comments
    async function loadComments() {
        try {
            const response = await fetch(`${API_URL}/comments`);
            if(response.status === 401) {
                showLoginModal();
                return;
            }
            const comments = await response.json();
            commentsTable.innerHTML = '';
            comments.forEach(comment => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${comment.content}</td>
                    <td>${comment.postTitle || 'N/A'}</td>
                    <td>${comment.authorName || 'N/A'}</td>
                    <td>${comment.status}</td>
                    <td class="actions">
                        ${comment.status !== 'approved' ? `<button class="approve-btn" data-id="${comment.id}">Approve</button>` : ''}
                        <button class="delete-btn" data-id="${comment.id}">Delete</button>
                    </td>
                `;
                commentsTable.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    // Handle create post button click
    createPostBtn.addEventListener('click', () => {
        window.location.href = 'post-edit.html';
    });

    // Handle actions on posts table
    postsTable.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            window.location.href = `post-edit.html?id=${id}`;
        }

        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this post?')) {
                try {
                    await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' });
                    loadPosts();
                } catch (error) {
                    console.error('Error deleting post:', error);
                }
            }
        }
    });

    // Handle actions on comments table
    commentsTable.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.dataset.id;

        if (target.classList.contains('approve-btn')) {
            try {
                await fetch(`${API_URL}/comments/${id}/approve`, { method: 'PUT' });
                loadComments();
            } catch (error) {
                console.error('Error approving comment:', error);
            }
        }

        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this comment?')) {
                try {
                    await fetch(`${API_URL}/comments/${id}`, { method: 'DELETE' });
                    loadComments();
                } catch (error) {
                    console.error('Error deleting comment:', error);
                }
            }
        }
    });

    // Add event listeners for login modal
    document.querySelector('#loginModal .btn-primary').addEventListener('click', login);
    document.querySelector('#loginModal .btn-secondary').addEventListener('click', closeLoginModal);


    // Initial load
    checkAuth();
});