/**
 * @fileoverview The search controller
 * Handles all search functionality including suggestions and results
 *
 * @author NooblyJS Team
 * @version 2.0.0
 * @since 2025-10-01
 */

import { documentController } from "./documentcontroller.js";

export const searchController = {
    app: null,
    searchTimeout: null,
    currentSuggestionIndex: -1,
    isShowingSuggestions: false,

    init(app) {
        this.app = app;
    },

    /**
     * Initialize search functionality with event listeners
     */
    initSearchFunctionality() {
        const searchInput = document.getElementById('globalSearch');
        const suggestionsContainer = document.getElementById('searchSuggestions');

        if (!searchInput || !suggestionsContainer) {
            console.error('Search initialization failed - missing elements:', {
                searchInput: !!searchInput,
                suggestionsContainer: !!suggestionsContainer
            });
            return;
        }

        console.log('Search functionality initialized successfully');

        // Initialize search state variables
        this.searchTimeout = null;
        this.currentSuggestionIndex = -1;
        this.isShowingSuggestions = false;

        // Handle input changes for suggestions
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            clearTimeout(this.searchTimeout);

            if (query.length === 0) {
                this.hideSuggestions();
                return;
            }

            if (query.length >= 2) {
                this.searchTimeout = setTimeout(() => {
                    this.fetchSuggestions(query);
                }, 300);
            }
        });

        // Handle key navigation
        searchInput.addEventListener('keydown', (e) => {
            const suggestionItems = suggestionsContainer.querySelectorAll('.suggestion-item');

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.isShowingSuggestions && suggestionItems.length > 0) {
                        this.currentSuggestionIndex = Math.min(this.currentSuggestionIndex + 1, suggestionItems.length - 1);
                        this.highlightSuggestion(this.currentSuggestionIndex);
                    }
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    if (this.isShowingSuggestions && suggestionItems.length > 0) {
                        this.currentSuggestionIndex = Math.max(this.currentSuggestionIndex - 1, -1);
                        this.highlightSuggestion(this.currentSuggestionIndex);
                    }
                    break;

                case 'Enter':
                    e.preventDefault();
                    console.log('Enter pressed in search', {
                        isShowingSuggestions: this.isShowingSuggestions,
                        currentIndex: this.currentSuggestionIndex,
                        query: searchInput.value
                    });
                    if (this.isShowingSuggestions && this.currentSuggestionIndex >= 0 && suggestionItems[this.currentSuggestionIndex]) {
                        // Select the highlighted suggestion
                        const suggestionData = suggestionItems[this.currentSuggestionIndex].dataset;
                        this.selectSuggestion(suggestionData);
                    } else {
                        // Perform full search
                        console.log('Calling performSearch()');
                        this.performSearch();
                    }
                    break;

                case 'Escape':
                    this.hideSuggestions();
                    searchInput.blur();
                    break;
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        // Show suggestions when focusing if there's a query
        searchInput.addEventListener('focus', () => {
            const query = searchInput.value.trim();
            if (query.length >= 2) {
                this.fetchSuggestions(query);
            }
        });
    },

    /**
     * Fetch search suggestions from the API
     */
    async fetchSuggestions(query) {
        try {
            const response = await fetch(`/applications/wiki/api/search/suggestions?q=${encodeURIComponent(query)}&limit=8`);
            const suggestions = await response.json();

            this.displaySuggestions(suggestions);
        } catch (error) {
            console.error('Suggestions error:', error);
            this.hideSuggestions();
        }
    },

    /**
     * Display search suggestions in the dropdown
     */
    displaySuggestions(suggestions) {
        const container = document.getElementById('searchSuggestions');

        if (!suggestions || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        const html = suggestions.map(suggestion => {
            // Handle both string and object suggestions
            let title, icon, dataPath, dataSpaceName, dataType, subtitle;

            if (typeof suggestion === 'string') {
                // Simple string suggestion - use it as the search term
                title = suggestion;
                icon = this.getSuggestionIcon('search-term');
                dataPath = '';
                dataSpaceName = '';
                dataType = 'search-term';
                subtitle = 'Search for this term';
            } else {
                // Object suggestion with metadata
                title = suggestion.title || suggestion.name || 'Untitled';
                icon = this.getSuggestionIcon(suggestion.type || suggestion.baseType);
                dataPath = suggestion.path || suggestion.relativePath || '';
                dataSpaceName = suggestion.spaceName || suggestion.baseType || '';
                dataType = suggestion.type || 'document';
                subtitle = suggestion.spaceName ? `in ${suggestion.spaceName}` : '';
            }

            return `
                <div class="suggestion-item"
                     data-path="${dataPath}"
                     data-space-name="${dataSpaceName}"
                     data-title="${title}"
                     data-type="${dataType}">
                    <svg class="suggestion-icon" width="16" height="16">
                        <use href="#${icon}"></use>
                    </svg>
                    <div class="suggestion-text">
                        <div class="suggestion-title">${title}</div>
                        ${subtitle ? `<div class="suggestion-subtitle">${subtitle}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // Add click handlers to suggestions
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectSuggestion(item.dataset);
            });
        });

        container.classList.remove('hidden');
        this.isShowingSuggestions = true;
        this.currentSuggestionIndex = -1;
    },

    /**
     * Get icon for suggestion type
     */
    getSuggestionIcon(type) {
        switch (type) {
            case 'markdown':
            case 'wiki-document':
                return 'icon-file';
            case 'folder':
                return 'icon-folder';
            case 'code':
                return 'icon-edit';
            case 'image':
                return 'icon-eye';
            case 'search-term':
                return 'icon-search';
            default:
                return 'icon-file';
        }
    },

    /**
     * Highlight a suggestion at the given index
     */
    highlightSuggestion(index) {
        const container = document.getElementById('searchSuggestions');
        const items = container.querySelectorAll('.suggestion-item');

        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    },

    /**
     * Handle selection of a suggestion
     */
    selectSuggestion(suggestionData) {
        const { path, spaceName, title, type } = suggestionData;

        this.hideSuggestions();

        // If it's a search term or no specific document, update search box and perform search
        if (type === 'search-term' || (!path || !spaceName)) {
            const searchInput = document.getElementById('globalSearch');
            if (searchInput && title) {
                searchInput.value = title;
            }
            this.performSearch();
        } else {
            // It's a specific document, ensure we exit editor mode and load it cleanly
            documentController.exitEditorMode();
            documentController.openDocumentByPath(path, spaceName);
        }
    },

    /**
     * Hide search suggestions dropdown
     */
    hideSuggestions() {
        const container = document.getElementById('searchSuggestions');
        container.classList.add('hidden');
        container.innerHTML = '';
        this.isShowingSuggestions = false;
        this.currentSuggestionIndex = -1;
    },

    /**
     * Perform a full search and display results
     */
    async performSearch() {
        const searchInput = document.getElementById('globalSearch');
        const query = searchInput.value.trim();
        console.log('performSearch called with query:', query);

        if (!query) {
            console.log('Empty query, returning');
            return;
        }

        this.hideSuggestions();

        try {
            // Build URL with space filter if a space is selected
            let url = `/applications/wiki/api/search?q=${encodeURIComponent(query)}&includeContent=false`;
            if (this.app.currentSpace) {
                url += `&spaceName=${encodeURIComponent(this.app.currentSpace.name)}`;
            }
            console.log('Fetching search results from:', url);
            const response = await fetch(url);
            const results = await response.json();
            console.log('Search results received:', results);

            this.showSearchResults(query, results);
        } catch (error) {
            console.error('Search error:', error);
            this.app.showNotification('Search failed', 'error');
        }
    },

    /**
     * Display search results in the results view
     */
    showSearchResults(query, results) {

        console.log(results);

        // Update search query display
        const queryElement = document.getElementById('searchQuery');
        if (queryElement) {
            queryElement.textContent = `"${query}"`;
        }

        // Show search results view
        this.app.setActiveView('search');

        const container = document.getElementById('searchResults');
        if (!container) return;

        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="no-content-message">
                    <svg width="48" height="48" class="no-content-icon">
                        <use href="#icon-search"></use>
                    </svg>
                    <p>No results found for "${query}"</p>
                    <p class="text-muted">Try different keywords or check your spelling</p>
                </div>
            `;
            return;
        }

        const resultsHtml = results.map(result => {
            const icon = this.getSuggestionIcon(result.type || 'document');
            const title = result.title || result.name || 'Untitled';
            const excerpt = result.excerpt || 'No description available';
            const path = result.path || result.relativePath || '';
            const spaceName = result.spaceName || 'Unknown Space';
            const modifiedDate = result.modifiedAt ? new Date(result.modifiedAt).toLocaleDateString() : '';

            // Escape HTML attributes to prevent breaking the DOM
            const escapedPath = path.replace(/"/g, '&quot;');
            const escapedSpaceName = spaceName.replace(/"/g, '&quot;');
            const escapedTitle = title.replace(/"/g, '&quot;');

            return `
                <div class="search-result-item"
                     data-path="${escapedPath}"
                     data-space-name="${escapedSpaceName}"
                     data-title="${escapedTitle}">
                    <div class="search-result-icon">
                        <svg width="20" height="20">
                            <use href="#${icon}"></use>
                        </svg>
                    </div>
                    <div class="search-result-content">
                        <h3 class="search-result-title">${title}</h3>
                        <p class="search-result-excerpt">${excerpt}</p>
                        <div class="search-result-meta">
                            <span class="search-result-space">${spaceName}</span>
                            ${modifiedDate ? `<span class="search-result-date">Modified ${modifiedDate}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="search-results-header">
                <h2>Found ${results.length} result${results.length === 1 ? '' : 's'}</h2>
            </div>
            <div class="search-results-list">
                ${resultsHtml}
            </div>
        `;

        // Add click handlers to results
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                console.log('Search result clicked!');
                console.log('Item dataset:', item.dataset);
                const { path, spaceName, title } = item.dataset;
                console.log('Extracted values - path:', path, 'spaceName:', spaceName, 'title:', title);
                // Ensure we exit editor mode before loading new content
                documentController.exitEditorMode();
                documentController.openDocumentByPath(path, spaceName);
            });
        });
    }
};
