chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('apiUrl', ({ apiUrl }) => {
    if (!apiUrl) {
      chrome.runtime.openOptionsPage();
    }
  });
});
