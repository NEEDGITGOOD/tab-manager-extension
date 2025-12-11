// Tab Manager Extension - Main Logic

// Storage key for duplicate history (synced with background.js)
const DUPLICATE_HISTORY_KEY = 'duplicateHistory';

// Default settings (synced with settings.js)
const DEFAULT_SETTINGS = {
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
    return { ...DEFAULT_SETTINGS, ...result.tabManagerSettings };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Utility function to extract domain from URL
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

// Generate a color for tab groups based on domain name
function getGroupColor(domain) {
  const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Check if a string is an IP address
function isIPAddress(str) {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv4Pattern.test(str) || ipv6Pattern.test(str);
}

// Get a friendly name for the domain
function getFriendlyDomainName(domain, settings = {}) {
  // If it's an IP address, return it as-is
  if (isIPAddress(domain)) {
    return domain;
  }
  
  let name = domain;
  
  // Remove www. prefix if setting is enabled
  if (settings.removeWww !== false) {
    name = name.replace(/^www\./, '');
  }
  
  // Return full domain or just the main part
  if (settings.useFullDomain) {
    return name;
  }
  
  // Get the main part before TLD for common sites
  const parts = name.split('.');
  if (parts.length >= 2) {
    // Capitalize first letter
    name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return name;
}

// Update statistics in the popup
async function updateStats() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const domains = new Set();
    const urlCounts = {};

    tabs.forEach(tab => {
      const domain = getDomain(tab.url);
      if (domain) {
        domains.add(domain);
        urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1;
      }
    });

    const duplicateCount = Object.values(urlCounts).filter(count => count > 1).reduce((sum, count) => sum + count - 1, 0);

    document.getElementById('tabCount').textContent = tabs.length;
    document.getElementById('domainCount').textContent = domains.size;
    document.getElementById('duplicateCount').textContent = duplicateCount;
    
    // Update badge on extension icon
    updateBadge(duplicateCount);
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Update the extension badge with duplicate count
async function updateBadge(count) {
  try {
    if (count > 0) {
      await chrome.action.setBadgeText({ text: count.toString() });
      await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Show status message
function showStatus(message, type = 'success') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  
  setTimeout(() => {
    statusEl.className = 'status-message';
  }, 3000);
}

// Group tabs by domain
async function groupTabsByDomain() {
  const btn = document.getElementById('groupByDomain');
  btn.disabled = true;
  btn.innerHTML = '<span class="icon">◌</span> Grouping...';

  try {
    const settings = await loadSettings();
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const domainTabs = {};

    // Organize tabs by domain
    tabs.forEach(tab => {
      const domain = getDomain(tab.url);
      if (domain) {
        if (!domainTabs[domain]) {
          domainTabs[domain] = [];
        }
        domainTabs[domain].push(tab);
      }
    });

    // Get existing groups to avoid duplicates
    const existingGroups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    const existingGroupNames = new Map();
    existingGroups.forEach(group => {
      if (group.title) {
        existingGroupNames.set(group.title.toLowerCase(), group.id);
      }
    });

    let groupedCount = 0;
    const minTabsForGroup = settings.minTabsToGroup || 1;

    // Create groups for domains with enough tabs
    for (const [domain, tabList] of Object.entries(domainTabs)) {
      if (tabList.length >= minTabsForGroup) {
        const tabIds = tabList.map(tab => tab.id);
        const groupName = getFriendlyDomainName(domain, settings);
        
        // Determine color
        const groupColor = settings.defaultColor === 'auto' 
          ? getGroupColor(domain) 
          : settings.defaultColor;
        
        // Check if a group with this name already exists
        const existingGroupId = existingGroupNames.get(groupName.toLowerCase());
        
        if (existingGroupId) {
          // Add tabs to existing group
          await chrome.tabs.group({ tabIds, groupId: existingGroupId });
          // Ensure existing group is expanded based on settings
          const shouldCollapse = settings.autoCollapse && tabList.length >= settings.collapseThreshold;
          await chrome.tabGroups.update(existingGroupId, { collapsed: shouldCollapse });
        } else {
          // Create new group
          const groupId = await chrome.tabs.group({ tabIds });
          const shouldCollapse = settings.autoCollapse && tabList.length >= settings.collapseThreshold;
          await chrome.tabGroups.update(groupId, {
            title: groupName,
            color: groupColor,
            collapsed: shouldCollapse
          });
        }
        
        groupedCount += tabList.length;
      }
    }

    showStatus(`Grouped ${groupedCount} tabs into ${Object.keys(domainTabs).length} domains`);
    await updateStats();
  } catch (error) {
    console.error('Error grouping tabs:', error);
    showStatus('Error grouping tabs: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="icon">▤</span> Group by Domain';
  }
}

// Normalize URL based on settings for duplicate detection
function normalizeUrlForDuplicates(url, settings) {
  try {
    const urlObj = new URL(url);
    
    // Remove fragment/hash if setting is enabled
    if (settings.ignoreFragments) {
      urlObj.hash = '';
    }
    
    // Remove query params if setting is enabled
    if (settings.ignoreQueryParams) {
      urlObj.search = '';
    }
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

// Find duplicate tabs
async function findDuplicates() {
  const btn = document.getElementById('findDuplicates');
  btn.disabled = true;
  btn.innerHTML = '<span class="icon">◌</span> Scanning...';

  try {
    const settings = await loadSettings();
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const urlTabs = {};

    // Group tabs by normalized URL
    tabs.forEach(tab => {
      const normalizedUrl = normalizeUrlForDuplicates(tab.url, settings);
      if (!urlTabs[normalizedUrl]) {
        urlTabs[normalizedUrl] = [];
      }
      urlTabs[normalizedUrl].push(tab);
    });

    // Filter to only duplicates
    const duplicates = Object.entries(urlTabs)
      .filter(([_, tabs]) => tabs.length > 1)
      .map(([url, tabs]) => ({
        url,
        tabs,
        domain: getDomain(url)
      }));

    displayDuplicates(duplicates, settings);
  } catch (error) {
    console.error('Error finding duplicates:', error);
    showStatus('Error finding duplicates: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="icon">⊘</span> Find Duplicates';
  }
}

// Display duplicates in the UI
function displayDuplicates(duplicates, settings = {}) {
  const section = document.getElementById('duplicatesSection');
  const list = document.getElementById('duplicateList');
  const autoSelect = settings.autoSelectDuplicates !== false;
  
  if (duplicates.length === 0) {
    list.innerHTML = `
      <div class="no-duplicates">
        <div class="icon">—</div>
        <div>No duplicates found</div>
      </div>
    `;
    section.style.display = 'block';
    document.getElementById('closeSelected').style.display = 'none';
    document.querySelector('.select-actions').style.display = 'none';
    return;
  }

  document.getElementById('closeSelected').style.display = 'block';
  document.querySelector('.select-actions').style.display = 'flex';

  let html = '';
  
  duplicates.forEach(({ url, tabs, domain }) => {
    // Keep the first tab, mark the rest as duplicates to close
    tabs.slice(1).forEach(tab => {
      html += `
        <div class="duplicate-item">
          <input type="checkbox" class="duplicate-checkbox" data-tab-id="${tab.id}" ${autoSelect ? 'checked' : ''}>
          <div class="duplicate-info" data-tab-id="${tab.id}" title="Click to switch to this tab">
            <div class="duplicate-title">${escapeHtml(tab.title || 'Untitled')}</div>
            <div class="duplicate-url">${escapeHtml(domain || url)}</div>
          </div>
          <span class="duplicate-count">${tabs.length}x</span>
        </div>
      `;
    });
  });

  list.innerHTML = html;
  section.style.display = 'block';
  
  // Add click handlers to switch to tabs
  list.querySelectorAll('.duplicate-info').forEach(el => {
    el.addEventListener('click', async (e) => {
      const tabId = parseInt(e.currentTarget.dataset.tabId);
      await switchToTab(tabId);
    });
  });
}

// Switch to a specific tab
async function switchToTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } catch (error) {
    console.error('Error switching to tab:', error);
    showStatus('Could not switch to tab', 'error');
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close selected duplicate tabs
async function closeSelectedTabs() {
  const checkboxes = document.querySelectorAll('.duplicate-checkbox:checked');
  const tabIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.tabId));

  if (tabIds.length === 0) {
    showStatus('No tabs selected', 'error');
    return;
  }

  try {
    await chrome.tabs.remove(tabIds);
    showStatus(`Closed ${tabIds.length} duplicate tab(s)`);
    
    // Refresh the duplicate list and stats
    await updateStats();
    await findDuplicates();
  } catch (error) {
    console.error('Error closing tabs:', error);
    showStatus('Error closing tabs: ' + error.message, 'error');
  }
}

// Select all/none functionality
function selectAll() {
  document.querySelectorAll('.duplicate-checkbox').forEach(cb => cb.checked = true);
}

function selectNone() {
  document.querySelectorAll('.duplicate-checkbox').forEach(cb => cb.checked = false);
}

// Expand all tab groups
async function expandAllGroups() {
  try {
    const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    for (const group of groups) {
      await chrome.tabGroups.update(group.id, { collapsed: false });
    }
    showStatus(`Expanded ${groups.length} group(s)`);
  } catch (error) {
    console.error('Error expanding groups:', error);
    showStatus('Error expanding groups', 'error');
  }
}

// Collapse all tab groups
async function collapseAllGroups() {
  try {
    const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    for (const group of groups) {
      await chrome.tabGroups.update(group.id, { collapsed: true });
    }
    showStatus(`Collapsed ${groups.length} group(s)`);
  } catch (error) {
    console.error('Error collapsing groups:', error);
    showStatus('Error collapsing groups', 'error');
  }
}

// Ungroup all tabs
async function ungroupAllTabs() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const groupedTabs = tabs.filter(tab => tab.groupId !== -1);

    if (groupedTabs.length === 0) {
      showStatus('No grouped tabs to ungroup');
      return;
    }

    for (const tab of groupedTabs) {
      await chrome.tabs.ungroup(tab.id);
    }
    showStatus(`Ungrouped ${groupedTabs.length} tab(s)`);
    await updateStats();
  } catch (error) {
    console.error('Error ungrouping tabs:', error);
    showStatus('Error ungrouping tabs', 'error');
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
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');

  if (history.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  const html = history.map(entry => {
    const domain = getDomain(entry.closedTab.url) || entry.closedTab.url;
    return `
      <div class="history-item">
        <div class="history-title">${escapeHtml(entry.closedTab.title)}</div>
        <div class="history-meta">
          <div class="history-url">${escapeHtml(domain)}</div>
          <div class="history-time">${formatRelativeTime(entry.timestamp)}</div>
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
    showStatus('History cleared');
  } catch (error) {
    console.error('Error clearing history:', error);
    showStatus('Error clearing history', 'error');
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  loadHistory();

  document.getElementById('groupByDomain').addEventListener('click', groupTabsByDomain);
  document.getElementById('findDuplicates').addEventListener('click', findDuplicates);
  document.getElementById('closeSelected').addEventListener('click', closeSelectedTabs);
  document.getElementById('selectAll').addEventListener('click', selectAll);
  document.getElementById('selectNone').addEventListener('click', selectNone);
  document.getElementById('expandAll').addEventListener('click', expandAllGroups);
  document.getElementById('collapseAll').addEventListener('click', collapseAllGroups);
  document.getElementById('ungroupAll').addEventListener('click', ungroupAllTabs);
  document.getElementById('clearHistory').addEventListener('click', clearHistory);

  // Open settings page
  document.getElementById('openSettings').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
