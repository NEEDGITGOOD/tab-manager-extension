// Background service worker for Tab Manager Extension
// Keeps the duplicate count badge updated

// Check for duplicates and update badge
async function updateDuplicateBadge() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const urlCounts = {};

    tabs.forEach(tab => {
      if (tab.url) {
        urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1;
      }
    });

    const duplicateCount = Object.values(urlCounts)
      .filter(count => count > 1)
      .reduce((sum, count) => sum + count - 1, 0);

    if (duplicateCount > 0) {
      await chrome.action.setBadgeText({ text: duplicateCount.toString() });
      await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Update badge when tabs change
chrome.tabs.onCreated.addListener(updateDuplicateBadge);
chrome.tabs.onRemoved.addListener(updateDuplicateBadge);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    updateDuplicateBadge();
  }
});

// Update badge when window focus changes
chrome.windows.onFocusChanged.addListener(updateDuplicateBadge);

// Initial badge update
updateDuplicateBadge();
