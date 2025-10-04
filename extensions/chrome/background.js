/**
 * Background Service Worker for NooblyJS Wiki Extension
 * Handles session persistence and extension lifecycle
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('NooblyJS Wiki Extension installed');
    // Set default settings
    chrome.storage.local.set({
      serverUrl: 'http://localhost:3002'
    });
  } else if (details.reason === 'update') {
    console.log('NooblyJS Wiki Extension updated');
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSession') {
    chrome.storage.local.get(['sessionId', 'serverUrl'], (result) => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'setSession') {
    chrome.storage.local.set({
      sessionId: request.sessionId,
      serverUrl: request.serverUrl
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'clearSession') {
    chrome.storage.local.remove(['sessionId', 'currentSpace', 'currentPath'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  console.log('Extension connected');
});
