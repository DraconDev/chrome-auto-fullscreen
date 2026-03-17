# Auto Fullscreen

Auto fullscreen any page on load, navigation, or click-and-hold. Works everywhere — not just videos.

## Chrome Web Store Listing

**Short description** (for manifest — already set):
> Auto fullscreen any page on load, navigation, or click-and-hold. Works everywhere — not just videos.

**Long description** (paste into Chrome Web Store developer dashboard):

> Automatically enter fullscreen when browsing any website.
>
> **Features:**
> • Auto-fullscreen on any page load
> • Click and hold anywhere to toggle fullscreen (configurable hold time)
> • SPA navigation detection — works on YouTube, Odysee, and other single-page apps
> • Exit by moving cursor to the top edge of the screen
> • Smart blocking — won't fullscreen when clicking links, buttons, or form inputs
> • Visual charge ring animation during hold
> • Customizable hold time and theme color
> • Settings open in a full tab, not a tiny popup
>
> **How it works:**
> Uses Chrome's window fullscreen API to maximize your browser. Window size is saved before entering fullscreen and automatically restored on exit.
>
> **Privacy:**
> Only requires storage permission for your settings. No data collection, no external requests.
>
> **Permissions:**
> • Storage — save your preferences

## Features

- Auto-fullscreen on page load
- Click and hold anywhere to toggle fullscreen (configurable delay)
- SPA navigation detection (YouTube, Odysee) via URL polling
- Exit by moving cursor to top edge
- Block fullscreen on interactive elements (links, buttons, videos)
- Visual charge ring animation
- Customizable theme color
- Opens settings in a new tab (no tiny popup)

## How It Works

**Regular websites** (Wikipedia, Google, etc.): Page load triggers fullscreen. Click-and-hold anywhere enters fullscreen.

**Single-page apps** (YouTube, Odysee): The extension polls for URL changes. When the URL changes (e.g. navigating to a new video), it triggers fullscreen. Query parameters related to fullscreen mode (`fs`, `fs_mode`, `fullscreen`) are ignored to avoid false triggers.

**Fullscreen method**: Uses `chrome.windows.update({ state: "fullscreen" })` — the browser goes into OS-level fullscreen. Window size is saved before entering fullscreen and restored on exit.

## Settings

| Setting | Description |
|---------|-------------|
| Enabled | Master toggle |
| Fullscreen on page load | Auto fullscreen when navigating to any page |
| Fullscreen on SPA navigation | Detect navigation on SPAs via URL changes |
| Auto video fullscreen on nav | Try clicking the site's fullscreen button (experimental) |
| Never auto-exit on click | Charge only enters, never exits. Top edge still works. |
| Exit on top edge | Move cursor to top of screen to exit |
| Block on links and buttons | Skip fullscreen when clicking interactive elements |
| Charge animation | Ring animation during charge hold |
| Charge time | Hold duration before fullscreen (0 = instant, default 200ms) |
| Theme color | Color for the charge ring |

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Load unpacked from `.output/chrome-mv3` in `chrome://extensions`

## Development

```bash
npm run dev    # Dev server with hot reload
npm run build  # Production build
```

## Permissions

- `storage` — Save user settings

## Privacy

No data collection, no external requests.

## License

MIT
