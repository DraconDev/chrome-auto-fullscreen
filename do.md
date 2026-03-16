# What This Extension IS

This is a **general-purpose auto-fullscreen extension for ANY page**, NOT a video extension.

Videos are only relevant because they're the detection mechanism for SPA navigation.

## Core Behavior

### 1. Auto-Fullscreen on Page Load
- ANY page load → browser goes fullscreen
- Works on Wikipedia, Google, any site
- Uses `chrome.windows.update({ state: 'fullscreen' })`

### 2. Click/Charge to Fullscreen
- Left-click ANYWHERE on the page, hold for `longPressDelay` ms → fullscreen
- Not restricted to videos or specific elements
- If a video exists on the page → tries `requestFullscreen()` on it (better)
- If no video → uses `setWindowFullscreen` (browser window fullscreen)
- Instant mode (0ms) uses `requestFullscreen()` directly in mousedown (gesture alive)
- Charge mode (>0ms) uses `setWindowFullscreen` (gesture broken by setTimeout)

### 3. Auto-Fullscreen on SPA Navigation (YouTube, Odysee, etc.)
- SPA sites don't reload the page, so we detect "new content" via the `play` event on videos
- A new video playing = signal that SPA navigation happened
- Controlled by `autoFullscreenOnNewVideo` setting
- This is the ONLY reason videos matter to this extension

## NOT in scope
- Video-specific features
- Video player controls
- Anything that only works on video pages

## Removed
- `chrome.debugger` API (caused crashes/lag/notification spam)
- Synthetic F key dispatch (untrusted events, never worked)
- Video element button clicking (buggy, site-specific)
- `"debugger"` permission from manifest
