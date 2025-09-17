// Admin Write Interface - Markdown Editor
class AdminWriteApp {
    constructor() {
        this.currentPostId = null;
        this.isDirty = false;
        this.autoSaveInterval = null;
        this.tags = [];
        this.initializeEditor();
        this.setupEventListeners();
        this.loadPostIfEditing();
        this.startAutoSave();
    }

    initializeEditor() {
        this.titleInput = document.getElementById('titleInput');
        this.subtitleInput = document.getElementById('subtitleInput');
        this.contentEditor = document.getElementById('contentEditor');
        this.tagsInput = document.getElementById('tagsInput');
        this.tagsList = document.getElementById('tagsList');
        this.saveStatus = document.getElementById('saveStatus');

        // Auto-resize textareas
        this.setupAutoResize(this.titleInput);
        this.setupAutoResize(this.subtitleInput);
    }

    setupEventListeners() {
        // Content change detection
        [this.titleInput, this.subtitleInput, this.contentEditor].forEach(element => {
            element.addEventListener('input', () => this.markDirty());
        });

        // Tags input
        this.tagsInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTag(this.tagsInput.value.trim());
            }
        });

        // Prevent form submission on Enter in title/subtitle
        [this.titleInput, this.subtitleInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                }
            });
        });

        // Editor toolbar formatting
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'b':
                        e.preventDefault();
                        this.formatText('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.formatText('italic');
                        break;
                    case 'k':
                        e.preventDefault();
                        this.showLinkModal();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveDraft();
                        break;
                }
            }
        });

        // Window beforeunload
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }

    setupAutoResize(textarea) {
        const resize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };

        textarea.addEventListener('input', resize);
        resize(); // Initial resize
    }

    loadPostIfEditing() {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');

        if (postId) {
            this.currentPostId = postId;
            this.loadPost(postId);
        } else {
            // Generate new post ID for drafts
            this.currentPostId = 'draft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    }

    async loadPost(postId) {
        try {
            const response = await fetch(`/api/blog/posts/${postId}`);
            if (response.ok) {
                const post = await response.json();
                this.populateEditor(post);
                this.markClean();
            } else {
                console.error('Failed to load post:', response.statusText);
            }
        } catch (error) {
            console.error('Error loading post:', error);
        }
    }

    populateEditor(post) {
        this.titleInput.value = post.title || '';
        this.subtitleInput.value = post.subtitle || '';
        this.contentEditor.innerHTML = this.markdownToHtml(post.content || '');

        // Load tags
        this.tags = post.tags || [];
        this.renderTags();

        // Update slug
        const slugInput = document.getElementById('storySlug');
        if (slugInput) {
            slugInput.value = post.slug || this.generateSlug(post.title);
        }

        // Trigger resize
        this.titleInput.dispatchEvent(new Event('input'));
        this.subtitleInput.dispatchEvent(new Event('input'));
    }

    markDirty() {
        this.isDirty = true;
        this.updateSaveStatus('Unsaved changes');
    }

    markClean() {
        this.isDirty = false;
        this.updateSaveStatus('Saved');
    }

    updateSaveStatus(status) {
        this.saveStatus.textContent = status;
        this.saveStatus.className = status === 'Saved' ? 'save-status saved' : 'save-status unsaved';
    }

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (this.isDirty) {
                this.saveDraft();
            }
        }, 30000); // Auto-save every 30 seconds
    }

    async saveDraft() {
        if (!this.isDirty && this.currentPostId) return;

        this.updateSaveStatus('Saving...');

        const postData = this.getPostData();
        postData.status = 'draft';

        try {
            const url = this.currentPostId.startsWith('draft_')
                ? '/api/blog/posts'
                : `/api/blog/posts/${this.currentPostId}`;

            const method = this.currentPostId.startsWith('draft_') ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            });

            if (response.ok) {
                const savedPost = await response.json();
                if (this.currentPostId.startsWith('draft_')) {
                    this.currentPostId = savedPost.id;
                    // Update URL without page reload
                    history.replaceState(null, '', `?id=${savedPost.id}`);
                }
                this.markClean();
            } else {
                this.updateSaveStatus('Save failed');
                console.error('Failed to save post:', response.statusText);
            }
        } catch (error) {
            this.updateSaveStatus('Save failed');
            console.error('Error saving post:', error);
        }
    }

    getPostData() {
        return {
            id: this.currentPostId,
            title: this.titleInput.value.trim(),
            subtitle: this.subtitleInput.value.trim(),
            content: this.htmlToMarkdown(this.contentEditor.innerHTML),
            tags: this.tags,
            slug: this.generateSlug(this.titleInput.value),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            author: 'current-user' // This should come from authentication
        };
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    // Text formatting functions
    formatText(command) {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        if (!this.contentEditor.contains(range.commonAncestorContainer)) {
            this.contentEditor.focus();
            return;
        }

        switch(command) {
            case 'bold':
                document.execCommand('bold');
                break;
            case 'italic':
                document.execCommand('italic');
                break;
            case 'underline':
                document.execCommand('underline');
                break;
            case 'h1':
                document.execCommand('formatBlock', false, 'h1');
                break;
            case 'h2':
                document.execCommand('formatBlock', false, 'h2');
                break;
            case 'h3':
                document.execCommand('formatBlock', false, 'h3');
                break;
            case 'quote':
                document.execCommand('formatBlock', false, 'blockquote');
                break;
            case 'code':
                this.wrapSelection('code');
                break;
            case 'link':
                this.showLinkModal();
                break;
            case 'list':
                document.execCommand('insertUnorderedList');
                break;
            case 'numbered-list':
                document.execCommand('insertOrderedList');
                break;
        }

        this.markDirty();
    }

    wrapSelection(tag) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const element = document.createElement(tag);
            element.appendChild(range.extractContents());
            range.insertNode(element);
            selection.removeAllRanges();
        }
    }

    // Tags management
    addTag(tagText) {
        if (!tagText || this.tags.includes(tagText)) return;

        this.tags.push(tagText);
        this.tagsInput.value = '';
        this.renderTags();
        this.markDirty();
    }

    removeTag(tagText) {
        this.tags = this.tags.filter(tag => tag !== tagText);
        this.renderTags();
        this.markDirty();
    }

    renderTags() {
        this.tagsList.innerHTML = this.tags.map(tag => `
            <span class="tag">
                ${tag}
                <button type="button" class="tag-remove" onclick="adminWriteApp.removeTag('${tag}')">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
    }

    // Markdown conversion (simplified)
    markdownToHtml(markdown) {
        return markdown
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            .replace(/\n/g, '<br>');
    }

    htmlToMarkdown(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Convert back to markdown (simplified)
        let markdown = temp.innerHTML
            .replace(/<h1>(.*?)<\/h1>/g, '# $1\n')
            .replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
            .replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
            .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
            .replace(/<em>(.*?)<\/em>/g, '*$1*')
            .replace(/<code>(.*?)<\/code>/g, '`$1`')
            .replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1')
            .replace(/<a href="([^"]+)">(.*?)<\/a>/g, '[$2]($1)')
            .replace(/<br>/g, '\n')
            .replace(/<[^>]*>/g, ''); // Remove remaining HTML tags

        return markdown;
    }

    // Image handling
    insertImage() {
        document.getElementById('imageModal').classList.remove('hidden');
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // In a real implementation, you would upload to a server
        // For now, we'll create a data URL
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = document.getElementById('imageAlt').value || '';

            const caption = document.getElementById('imageCaption').value;
            if (caption) {
                const figure = document.createElement('figure');
                figure.appendChild(img);
                const figcaption = document.createElement('figcaption');
                figcaption.textContent = caption;
                figure.appendChild(figcaption);
                this.insertNodeAtCursor(figure);
            } else {
                this.insertNodeAtCursor(img);
            }

            this.closeImageModal();
            this.markDirty();
        };
        reader.readAsDataURL(file);
    }

    insertNodeAtCursor(node) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(node);
            range.setStartAfter(node);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            this.contentEditor.appendChild(node);
        }
    }

    // Publishing
    async publishStory() {
        await this.saveDraft(); // Save first

        const postData = this.getPostData();
        postData.status = 'published';
        postData.publishedAt = new Date().toISOString();
        postData.category = document.getElementById('categorySelect').value;
        postData.allowComments = document.getElementById('allowComments').checked;

        try {
            const response = await fetch(`/api/blog/posts/${this.currentPostId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            });

            if (response.ok) {
                this.closePublishModal();
                this.markClean();
                // Redirect to stories page
                window.location.href = '/applications/blog/admin/stories';
            } else {
                alert('Failed to publish story. Please try again.');
            }
        } catch (error) {
            console.error('Error publishing story:', error);
            alert('Failed to publish story. Please try again.');
        }
    }

    async publishAsUnlisted() {
        await this.saveDraft();

        const postData = this.getPostData();
        postData.status = 'unlisted';
        postData.publishedAt = new Date().toISOString();

        try {
            const response = await fetch(`/api/blog/posts/${this.currentPostId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            });

            if (response.ok) {
                this.closePublishModal();
                this.markClean();
                window.location.href = '/applications/blog/admin/stories';
            } else {
                alert('Failed to publish story as unlisted. Please try again.');
            }
        } catch (error) {
            console.error('Error publishing story as unlisted:', error);
            alert('Failed to publish story as unlisted. Please try again.');
        }
    }

    previewPost() {
        const postData = this.getPostData();
        // Open preview in new tab (would be implemented as a preview page)
        const previewWindow = window.open('/applications/blog/preview', '_blank');
        if (previewWindow) {
            previewWindow.postMessage(postData, '*');
        }
    }

    async deletePost() {
        if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/blog/posts/${this.currentPostId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                window.location.href = '/applications/blog/admin/stories';
            } else {
                alert('Failed to delete story. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting story:', error);
            alert('Failed to delete story. Please try again.');
        }
    }
}

// Modal functions
function showPublishModal() {
    const modal = document.getElementById('publishModal');
    const previewTitle = document.getElementById('previewTitle');
    const previewSubtitle = document.getElementById('previewSubtitle');

    previewTitle.textContent = adminWriteApp.titleInput.value || 'Untitled';
    previewSubtitle.textContent = adminWriteApp.subtitleInput.value || 'No subtitle';

    modal.classList.remove('hidden');
}

function closePublishModal() {
    document.getElementById('publishModal').classList.add('hidden');
}

function showSettingsModal() {
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.add('hidden');
}

function showLinkModal() {
    document.getElementById('linkModal').classList.remove('hidden');
    document.getElementById('linkUrl').focus();
}

function closeLinkModal() {
    document.getElementById('linkModal').classList.add('hidden');
    document.getElementById('linkUrl').value = '';
    document.getElementById('linkText').value = '';
}

function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
    document.getElementById('imageInput').value = '';
    document.getElementById('imageCaption').value = '';
    document.getElementById('imageAlt').value = '';
}

function insertLink() {
    const url = document.getElementById('linkUrl').value;
    const text = document.getElementById('linkText').value || url;

    if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = text;
        adminWriteApp.insertNodeAtCursor(link);
        adminWriteApp.markDirty();
    }

    closeLinkModal();
}

function triggerFileInput() {
    document.getElementById('imageInput').click();
}

function handleImageUpload(event) {
    adminWriteApp.handleImageUpload(event);
}

function toggleEditorMenu() {
    const dropdown = document.getElementById('editorDropdown');
    dropdown.classList.toggle('hidden');
}

function saveDraft() {
    adminWriteApp.saveDraft();
}

function publishStory() {
    adminWriteApp.publishStory();
}

function publishAsUnlisted() {
    adminWriteApp.publishAsUnlisted();
}

function previewPost() {
    adminWriteApp.previewPost();
}

function deletePost() {
    adminWriteApp.deletePost();
}

function saveSettings() {
    // Implementation for saving story settings
    closeSettingsModal();
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.editor-menu')) {
        document.getElementById('editorDropdown').classList.add('hidden');
    }
});

// Initialize the app
let adminWriteApp;
document.addEventListener('DOMContentLoaded', () => {
    adminWriteApp = new AdminWriteApp();
});

// Auto-save before page unload
window.addEventListener('beforeunload', () => {
    if (adminWriteApp && adminWriteApp.isDirty) {
        adminWriteApp.saveDraft();
    }
});