// Background service worker for Tab Manager Extension
// Handles badge updates and auto-close duplicates

// Default settings
const DEFAULT_SETTINGS = {
  autoCloseDuplicates: false,
  switchToOriginal: false,
  ignoreFragments: true,
  ignoreQueryParams: false
};

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get('tabManagerSettings');
    return { ...DEFAULT_SETTINGS, ...result.tabManagerSettings };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Normalize URL based on settings
function normalizeUrl(url, settings) {
  try {
    const urlObj = new URL(url);
    
    if (settings.ignoreFragments) {
      urlObj.hash = '';
    }
    
    if (settings.ignoreQueryParams) {
      urlObj.search = '';
    }
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

// Check for duplicates and update badge
async function updateDuplicateBadge() {
  try {
    const settings = await loadSettings();
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const urlCounts = {};

    tabs.forEach(tab => {
      if (tab.url) {
        const normalizedUrl = normalizeUrl(tab.url, settings);
        urlCounts[normalizedUrl] = (urlCounts[normalizedUrl] || 0) + 1;
      }
    });

    const duplicateCount = Object.values(urlCounts)
      .filter(count => count > 1)
      .reduce((sum, count) => sum + count - 1, 0);

    if (duplicateCount > 0) {
      await chrome.action.setBadgeText({ text: duplicateCount.toString() });
      await chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Check if a tab is a duplicate and close it if auto-close is enabled
async function checkAndCloseDuplicate(tabId, url) {
  try {
    const settings = await loadSettings();
    
    if (!settings.autoCloseDuplicates || !url) {
      return;
    }
    
    // Skip internal browser pages
    if (url.startsWith('chrome://') || url.startsWith('brave://') || 
        url.startsWith('edge://') || url.startsWith('about:')) {
      return;
    }
    
    const normalizedNewUrl = normalizeUrl(url, settings);
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    // Find existing tabs with the same URL (excluding the new tab)
    const existingTab = tabs.find(tab => {
      if (tab.id === tabId) return false;
      if (!tab.url) return false;
      return normalizeUrl(tab.url, settings) === normalizedNewUrl;
    });
    
    if (existingTab) {
      // Close the new duplicate tab
      await chrome.tabs.remove(tabId);
      // Switch to the existing tab only if setting is enabled
      if (settings.switchToOriginal) {
        await chrome.tabs.update(existingTab.id, { active: true });
      }
    }
  } catch (error) {
    // Tab might already be closed or invalid
    console.error('Error checking duplicate:', error);
  }
}

// Handle tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    checkAndCloseDuplicate(tabId, changeInfo.url);
    updateDuplicateBadge();
  }
});

// Handle new tabs (for tabs opened with a URL)
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.url && tab.url !== 'chrome://newtab/' && tab.url !== 'brave://newtab/') {
    checkAndCloseDuplicate(tab.id, tab.url);
  }
  updateDuplicateBadge();
});

// Update badge when tabs are removed
chrome.tabs.onRemoved.addListener(updateDuplicateBadge);

// Update badge when window focus changes
chrome.windows.onFocusChanged.addListener(updateDuplicateBadge);

// Update badge when settings change
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.tabManagerSettings) {
    updateDuplicateBadge();
  }
});

// Initial badge update
updateDuplicateBadge();
