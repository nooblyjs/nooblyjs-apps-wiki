// Blog Platform JavaScript
(function() {
  'use strict';

  // Initialize blog functionality
  document.addEventListener('DOMContentLoaded', function() {
    initializeBlog();
  });

  function initializeBlog() {
    // Social sharing functionality
    initializeSocialSharing();

    // Comment form handling
    initializeCommentForm();

    // Search functionality
    initializeSearch();

    // Reading time calculation
    calculateReadingTime();

    console.log('Blog platform initialized');
  }

  function initializeSocialSharing() {
    const shareButtons = document.querySelectorAll('.share-button');
    shareButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const platform = this.dataset.platform;
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(document.title);

        let shareUrl = '';
        switch(platform) {
          case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
            break;
          case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
          case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
            break;
        }

        if (shareUrl) {
          window.open(shareUrl, '_blank', 'width=600,height=400');
        }
      });
    });
  }

  function initializeCommentForm() {
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // Comment submission logic would go here
        console.log('Comment form submitted');
      });
    }
  }

  function initializeSearch() {
    const searchInput = document.getElementById('blog-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          performSearch(this.value);
        }, 300);
      });
    }
  }

  function performSearch(query) {
    if (query.length < 2) return;

    // Search logic would go here
    console.log('Searching for:', query);
  }

  function calculateReadingTime() {
    const posts = document.querySelectorAll('.blog-post-content');
    posts.forEach(post => {
      const text = post.textContent || post.innerText;
      const wordsPerMinute = 200;
      const wordCount = text.trim().split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / wordsPerMinute);

      const readingTimeElement = post.parentElement.querySelector('.reading-time');
      if (readingTimeElement) {
        readingTimeElement.textContent = `${readingTime} min read`;
      }
    });
  }

  // Export functions for external use
  window.BlogPlatform = {
    initializeBlog: initializeBlog,
    calculateReadingTime: calculateReadingTime
  };
})();