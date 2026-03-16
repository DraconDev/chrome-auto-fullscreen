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

- **Enabled** — Toggle the extension on/off
- **Auto-Fullscreen on Load** — Automatically fullscreen when a page loads
- **Long Press Delay** — How long to hold click before fullscreen (0 = instant, default 200ms)
- **Enter Only** — One-way fullscreen: extension enters fullscreen but never exits it
- **Fullscreen on New Video** — Auto-fullscreen on SPA navigation (YouTube, Odysee)

## Permissions

- `storage` — Save user settings

## License

MIT
