# Auto Fullscreen

A Chrome extension that automatically enters fullscreen when browsing. Works on any page — not just videos.

## What It Does

1. **Auto-Fullscreen on Load** — Opens any page in fullscreen automatically
2. **Click/Charge to Fullscreen** — Left-click anywhere on the page and hold (default 200ms) to enter fullscreen
3. **SPA Navigation Detection** — On single-page apps like YouTube or Odysee, detects content changes and auto-fullscreens

## How It Works

### Regular Websites (Wikipedia, Google, etc.)
Page load triggers fullscreen. Click-and-hold anywhere enters fullscreen.

### Single-Page Apps (YouTube, Odysee)
Since SPAs don't reload the page, the extension detects new content via video playback events. When a new video starts playing, it's treated as a navigation and triggers fullscreen.

### Fullscreen Method
- **Click (instant mode, 0ms)** — Uses the Fullscreen API (`requestFullscreen`) directly within the user gesture
- **Charge (hold mode, 200ms+)** — Uses browser window fullscreen (`chrome.windows.update`), which doesn't require a gesture
- **Auto (on load/navigation)** — Uses browser window fullscreen

## Installation

### From Source

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

4. Load the unpacked extension from `.output/chrome-mv3` in Chrome (`chrome://extensions` -> Load Unpacked).

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build
```

## Settings

- **Enable Extension** — Toggle the extension on/off
- **Auto-Fullscreen on Load** — Automatically fullscreen when any page loads
- **Block on buttons/links** — Don't fullscreen when clicking interactive elements
- **Exit on top edge** — Move cursor to top edge to exit fullscreen
- **Never auto-exit on click** — Click/charge only enters fullscreen, never exits. Top edge exit still works independently.
- **Fullscreen on navigation** — Auto-fullscreen on SPA navigation (YouTube, Odysee) via URL change detection
- **Fullscreen video on click (F key)** — Also send F key to fullscreen the video element on click (uses debugger API, requires one-time "Allow" per tab)
- **Charge Time** — How long to hold click before fullscreen (0 = instant, default 200ms)

## Permissions

- `storage` — Save user settings

## License

MIT
