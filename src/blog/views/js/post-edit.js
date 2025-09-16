document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('post-form');
    const postIdInput = document.getElementById('post-id');
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');
    const authorSelect = document.getElementById('author');
    const categorySelect = document.getElementById('category');
    const statusSelect = document.getElementById('status');
    const pageTitle = document.getElementById('edit-post-title');

    const API_URL = '/applications/blog/api';
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    // Fetch authors and categories
    async function loadSelectOptions() {
        try {
            const [authorsRes, categoriesRes] = await Promise.all([
                fetch(`${API_URL}/authors`),
                fetch(`${API_URL}/categories`)
            ]);
            const authors = await authorsRes.json();
            const categories = await categoriesRes.json();

            authors.forEach(author => {
                const option = document.createElement('option');
                option.value = author.id;
                option.textContent = author.displayName;
                authorSelect.appendChild(option);
            });

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading authors or categories:', error);
        }
    }

    // Load post data for editing
    async function loadPostData() {
        if (postId) {
            pageTitle.textContent = 'Edit Post';
            try {
                const response = await fetch(`${API_URL}/admin/posts/${postId}`);
                const post = await response.json();
                postIdInput.value = post.id;
                titleInput.value = post.title;
                contentInput.value = post.content;
                authorSelect.value = post.authorId;
                categorySelect.value = post.categoryId;
                statusSelect.value = post.status;
            } catch (error) {
                console.error('Error loading post data:', error);
            }
        }
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const postData = {
            title: titleInput.value,
            content: contentInput.value,
            authorId: parseInt(authorSelect.value),
            categoryId: parseInt(categorySelect.value),
            status: statusSelect.value
        };

        try {
            let response;
            if (postId) {
                // Update existing post
                response = await fetch(`${API_URL}/posts/${postId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                });
            } else {
                // Create new post
                response = await fetch(`${API_URL}/posts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData)
                });
            }

            if (response.ok) {
                window.location.href = 'admin.html';
            } else {
                console.error('Error saving post:', await response.text());
            }
        } catch (error) {
            console.error('Error saving post:', error);
        }
    });

    // Initial load
    async function init() {
        await loadSelectOptions();
        if (postId) {
            await loadPostData();
        }
    }

    init();
});
