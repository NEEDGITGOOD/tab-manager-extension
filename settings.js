// Storage key for duplicate history (synced with background.js)
const DUPLICATE_HISTORY_KEY = 'duplicateHistory';

// Default settings
const defaultSettings = {
  // Grouping options
  autoCollapse: false,
  collapseThreshold: 3,
  minTabsToGroup: 1,
  removeWww: true,
  useFullDomain: false,
  
  // Duplicate detection
  autoCloseDuplicates: false,
  switchToOriginal: false,
  ignoreFragments: true,
  ignoreQueryParams: false,
  autoSelectDuplicates: true,
  
  // Appearance
  defaultColor: 'auto'
};

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get('tabManagerSettings');
    const settings = { ...defaultSettings, ...result.tabManagerSettings };
    
    // Apply settings to form
    document.getElementById('autoCollapse').checked = settings.autoCollapse;
    document.getElementById('collapseThreshold').value = settings.collapseThreshold;
    document.getElementById('minTabsToGroup').value = settings.minTabsToGroup;
    document.getElementById('removeWww').checked = settings.removeWww;
    document.getElementById('useFullDomain').checked = settings.useFullDomain;
    document.getElementById('autoCloseDuplicates').checked = settings.autoCloseDuplicates;
    document.getElementById('switchToOriginal').checked = settings.switchToOriginal;
    document.getElementById('ignoreFragments').checked = settings.ignoreFragments;
    document.getElementById('ignoreQueryParams').checked = settings.ignoreQueryParams;
    document.getElementById('autoSelectDuplicates').checked = settings.autoSelectDuplicates;
    document.getElementById('defaultColor').value = settings.defaultColor;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings to storage
async function saveSettings() {
  const settings = {
    autoCollapse: document.getElementById('autoCollapse').checked,
    collapseThreshold: parseInt(document.getElementById('collapseThreshold').value) || 3,
    minTabsToGroup: parseInt(document.getElementById('minTabsToGroup').value) || 1,
    removeWww: document.getElementById('removeWww').checked,
    useFullDomain: document.getElementById('useFullDomain').checked,
    autoCloseDuplicates: document.getElementById('autoCloseDuplicates').checked,
    switchToOriginal: document.getElementById('switchToOriginal').checked,
    ignoreFragments: document.getElementById('ignoreFragments').checked,
    ignoreQueryParams: document.getElementById('ignoreQueryParams').checked,
    autoSelectDuplicates: document.getElementById('autoSelectDuplicates').checked,
    defaultColor: document.getElementById('defaultColor').value
  };

  try {
    await chrome.storage.sync.set({ tabManagerSettings: settings });
    showStatus('Settings saved', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

// Reset to defaults
async function resetDefaults() {
  try {
    await chrome.storage.sync.set({ tabManagerSettings: defaultSettings });
    await loadSettings();
    showStatus('Settings reset', 'success');
  } catch (error) {
    console.error('Error resetting settings:', error);
    showStatus('Error resetting settings', 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;

  setTimeout(() => {
    statusEl.className = 'status-message';
  }, 3000);
}

// Switch between tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab content
  document.getElementById('settingsTab').classList.toggle('active', tabName === 'settings');
  document.getElementById('historyTab').classList.toggle('active', tabName === 'history');

  // Load history when switching to history tab
  if (tabName === 'history') {
    loadHistory();
  }
}

// Format relative time for history display
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

// Get domain from URL
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Get favicon URL for a given page URL
function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    // Use Google's favicon service as a reliable fallback
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return null;
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load and display duplicate history
async function loadHistory() {
  try {
    const result = await chrome.storage.local.get(DUPLICATE_HISTORY_KEY);
    const history = result[DUPLICATE_HISTORY_KEY] || [];
    displayHistory(history);
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

// Display history in the UI
function displayHistory(history) {
  const list = document.getElementById('historyList');
  const countEl = document.getElementById('historyCount');

  countEl.textContent = `${history.length} item${history.length !== 1 ? 's' : ''}`;

  if (history.length === 0) {
    list.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">⊘</div>
        <div class="history-empty-text">No auto-closed duplicates yet</div>
      </div>
    `;
    return;
  }

  const html = history.map(entry => {
    const domain = getDomain(entry.closedTab.url);
    const faviconUrl = getFaviconUrl(entry.closedTab.url);
    const escapedUrl = escapeHtml(entry.closedTab.url);

    return `
      <div class="history-item">
        <div class="history-favicon">
          ${faviconUrl
            ? `<img src="${faviconUrl}" alt="" onerror="this.parentElement.innerHTML='<span class=\\'history-favicon-fallback\\'>⊘</span>'">`
            : '<span class="history-favicon-fallback">⊘</span>'}
        </div>
        <div class="history-details">
          <div class="history-title">
            <a href="${escapedUrl}" target="_blank" title="Open in new tab">${escapeHtml(entry.closedTab.title)}</a>
          </div>
          <div class="history-domain">${escapeHtml(domain)}</div>
          <div class="history-url">
            <a href="${escapedUrl}" target="_blank" title="${escapedUrl}">${escapedUrl}</a>
          </div>
        </div>
        <div class="history-meta">
          <div class="history-time">${formatRelativeTime(entry.timestamp)}</div>
          <div class="history-action">auto-closed</div>
        </div>
      </div>
    `;
  }).join('');

  list.innerHTML = html;
}

// Clear duplicate history
async function clearHistory() {
  try {
    await chrome.storage.local.remove(DUPLICATE_HISTORY_KEY);
    displayHistory([]);
    showStatus('History cleared', 'success');
  } catch (error) {
    console.error('Error clearing history:', error);
    showStatus('Error clearing history', 'error');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetDefaults').addEventListener('click', resetDefaults);
  document.getElementById('clearHistory').addEventListener('click', clearHistory);

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
});
