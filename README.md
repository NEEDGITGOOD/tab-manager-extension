# Tab Manager

A browser extension for Chromium-based browsers (Chrome, Brave, Edge) that helps you organize tabs by grouping them by domain and finding duplicate tabs.

## Features

**Group by Domain** — Automatically organizes all open tabs into color-coded groups based on their domain. Tabs from `github.com` go into a "Github" group, tabs from `youtube.com` into a "Youtube" group, and so on.

**Find Duplicates** — Scans your open tabs for duplicates and lets you close them with one click. Click on any duplicate in the list to switch to that tab and verify which one to keep.

**Auto-Close Duplicates** — When enabled, automatically closes any new tab that's a duplicate of an existing tab and switches to the original. Enable this in Settings.

**Badge Counter** — The extension icon displays a badge showing how many duplicate tabs you currently have open, updated in real-time as you browse.

**Expand / Collapse / Ungroup** — Quick controls to expand all tab groups, collapse them, or remove all grouping entirely.

## Installation

### From Source

1. Download or clone this repository
2. Open your browser and navigate to the extensions page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the `tab-manager-extension` folder

### From Release

1. Download the latest `.zip` from [Releases](../../releases)
2. Extract the archive
3. Follow steps 2-5 above

## Usage

Click the extension icon in your toolbar to open the popup. From there:

- **Group by Domain** — Groups all tabs in the current window by their domain
- **Find Duplicates** — Shows a list of duplicate tabs with checkboxes to select which ones to close
- **Expand / Collapse / Ungroup** — Manage existing tab groups

When viewing duplicates, click on any tab's title to switch to it. This helps you identify which duplicate to keep before closing the others.

## Settings

Access settings by clicking "Settings" in the popup header, or right-click the extension icon and select "Options".

### Grouping

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-collapse groups | Collapse groups after creating them | Off |
| Collapse threshold | Only collapse groups with more than N tabs | 3 |
| Minimum tabs to group | Don't create groups for domains with fewer tabs | 1 |
| Strip www prefix | Show "Github" instead of "www.github.com" | On |
| Use full domain name | Show "github.com" instead of "Github" | Off |

### Duplicate Detection

| Setting | Description | Default |
|---------|-------------|---------|
| Auto-close duplicates | Instantly close tabs that duplicate an existing tab | Off |
| Switch to original tab | When auto-closing, switch focus to the existing tab | Off |
| Ignore URL fragments | Treat `page#a` and `page#b` as duplicates | On |
| Ignore query parameters | Treat `page?a=1` and `page?b=2` as duplicates | Off |
| Pre-select duplicates | Automatically check duplicates for closing | On |

### Appearance

| Setting | Description | Default |
|---------|-------------|---------|
| Group color | Color for tab groups (Auto assigns by domain) | Auto |

## Permissions

This extension requires the following permissions:

- `tabs` — Read tab URLs and titles to detect duplicates and group by domain
- `tabGroups` — Create and manage tab groups
- `storage` — Save your settings

## Browser Compatibility

Tested on:
- Brave 1.x
- Google Chrome 120+
- Microsoft Edge 120+

Requires a Chromium-based browser with Tab Groups support (Manifest V3).

## Development

The extension is built with vanilla JavaScript and requires no build process.

```
tab-manager-extension/
├── manifest.json      # Extension manifest (MV3)
├── popup.html         # Popup UI
├── popup.js           # Popup logic
├── settings.html      # Settings page UI
├── settings.js        # Settings logic
├── background.js      # Service worker for badge updates
└── icons/             # Extension icons
```

To modify the extension, edit the source files and reload the extension in your browser's extension page.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Contributing

Issues and pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.
