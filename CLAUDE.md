# CLAUDE.md - Tab Manager Extension

## Project Overview

A Chromium browser extension (Manifest V3) for organizing tabs by grouping them by domain and detecting/closing duplicates. Built with vanilla JavaScript, HTML5, and CSS3 - no build process required.

## Key Files

- `popup.js` - Main popup UI logic (grouping, duplicate detection, UI interactions)
- `background.js` - Service worker for badge updates and auto-close duplicates
- `settings.js` - Settings page management
- `manifest.json` - Extension configuration (Manifest V3)

## Development Workflow

```bash
# No build process - load directly in browser:
# 1. Navigate to chrome://extensions (or brave://extensions, edge://extensions)
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select project directory
# 4. After changes, click refresh icon on extension card
```

## Architecture

### Entry Points
- **popup.html/js** - User-facing popup (320px wide, dark theme)
- **background.js** - Service worker monitoring tab changes
- **settings.html/js** - Full-page settings configuration

### Settings Storage
All settings in `chrome.storage.sync` under key `tabManagerSettings`. DEFAULT_SETTINGS object is shared across popup.js, background.js, and settings.js - keep them in sync when modifying.

### Key Functions
- `groupTabsByDomain()` - Groups all tabs by their domain
- `findDuplicates()` - Detects and displays duplicate tabs
- `normalizeUrlForDuplicates()` - URL comparison respecting user settings
- `updateDuplicateBadge()` - Updates extension badge with duplicate count
- `checkAndCloseDuplicate()` - Auto-closes duplicate tabs when enabled
- `addToHistory()` / `loadHistory()` - Manages auto-close history in local storage
- `showDuplicateNotification()` - Shows browser notification when duplicate auto-closed

## Code Conventions

- Async/await for all Chrome API calls with try-catch error handling
- `escapeHtml()` for all user content to prevent XSS
- camelCase naming for variables and functions
- Status messages auto-dismiss after 3 seconds

## Chrome APIs Used

- `chrome.tabs` - Tab queries and management
- `chrome.tabGroups` - Tab group creation and updates
- `chrome.storage.sync` - Settings persistence
- `chrome.storage.local` - Duplicate history storage (key: `duplicateHistory`)
- `chrome.action` - Badge text and color
- `chrome.notifications` - Browser notifications for auto-closed duplicates

## Browser Compatibility

Chrome 120+, Brave 1.x+, Edge 120+ (any Chromium with MV3 and Tab Groups)
