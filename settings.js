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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetDefaults').addEventListener('click', resetDefaults);
});
