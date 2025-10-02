const settingsForm = document.getElementById('settings-form');
const apiUrlInput = document.getElementById('api-url');
const statusDiv = document.getElementById('status');

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get('apiUrl', ({ apiUrl }) => {
        if (apiUrl) {
            apiUrlInput.value = apiUrl;
        }
    });
});

settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const apiUrl = apiUrlInput.value.trim();
    if (apiUrl) {
        chrome.storage.sync.set({ apiUrl }, () => {
            statusDiv.textContent = 'Settings saved.';
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 2000);
        });
    }
});
