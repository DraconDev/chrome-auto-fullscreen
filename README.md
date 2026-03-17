# Auto Fullscreen

A Chrome extension that automatically enters fullscreen when browsing. Works on any page — not just videos.

## What It Does

1. **Auto-Fullscreen on Load** — Opens any page in fullscreen automatically
2. **Click/Charge to Fullscreen** — Left-click anywhere on the page and hold (default 200ms) to enter fullscreen. Click again to exit (if "Never auto-exit" is off).
3. **SPA Navigation Detection** — On single-page apps like YouTube or Odysee, detects URL changes and auto-fullscreens

## How It Works

### Regular Websites (Wikipedia, Google, etc.)
Page load triggers window fullscreen. Click-and-hold anywhere enters fullscreen.

### Single-Page Apps (YouTube, Odysee)
Since SPAs don't reload the page, the extension polls for URL changes. When the URL changes (e.g. navigating to a new video), it triggers fullscreen. Query parameters related to fullscreen mode (`fs`, `fs_mode`, `fullscreen`) are ignored to avoid false triggers.

### Fullscreen Method
All fullscreen operations use `chrome.windows.update({ state: "fullscreen" })` — the browser goes into OS-level fullscreen. Window size is saved before entering fullscreen and restored on exit.

## Settings

- **Enabled** — Master toggle for the extension
- **Fullscreen on page load** — Automatically fullscreen when navigating to any page
- **Fullscreen on SPA navigation** — Detect navigation on single-page apps via URL changes
- **Auto video fullscreen on navigation** — Try clicking the site's fullscreen button when navigating to a new video (experimental, may not work on all sites)
- **Never auto-exit** — Click/charge only enters fullscreen, never exits. Top edge exit still works independently.
- **Exit on top edge** — Move cursor to the top edge of the screen to exit fullscreen
- **Block on links and buttons** — Prevent fullscreen when clicking interactive elements (links, buttons, inputs, videos)
- **Charge animation** — Show a ring animation while holding the click
- **Charge time** — How long to hold click before fullscreen activates (0 = instant, default 200ms)
- **Theme color** — Color for the charge ring animation

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Load the unpacked extension from `.output/chrome-mv3` in Chrome (`chrome://extensions` → Load Unpacked)

## Development

```bash
npm run dev    # Start dev server
npm run build  # Build for production
```

## Permissions

- `storage` — Save user settings

## License

MIT
