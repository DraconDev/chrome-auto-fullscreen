import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;

    // --- New tab detection (for initial load) ---
    let newTabIntent = false;

    for (let i = 0; i < 5; i++) {
      const resp = await browser.runtime.sendMessage({
        action: "getModifierState",
      });
      if (resp?.ctrlHeld) {
        newTabIntent = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    // Fallback: check if modifier keys are physically held right now
    document.addEventListener(
      "keydown",
      (e) => {
        if (
          e.getModifierState("Control") ||
          e.getModifierState("Meta") ||
          e.getModifierState("Alt")
        ) {
          newTabIntent = true;
        }
      },
      true,
    );

    // Report modifier state to background (for new tabs to read)
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        browser.runtime.sendMessage({ action: "setModifiers", ctrl: true });
      }
    });
    document.addEventListener("keyup", (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        browser.runtime.sendMessage({ action: "setModifiers", ctrl: false });
      }
    });

    // --- Track last fullscreened video element ---
    let lastFullscreenedVideo: HTMLVideoElement | null = null;

    // --- Persist MMB/Ctrl+click state across content script reloads ---
    // Chrome unloads content scripts under memory pressure (after many tabs).
    // Without persistence, newTabIntent resets to false and fullscreen triggers.
    // Stores { url, ts } so stale flags from previous pages are ignored.
    const MMB_KEY = "af_mmb_intent";

    // Check persisted state - only honor if same URL (stale flags from previous
    // pages must be ignored, otherwise navigating to a new site won't fullscreen)
    try {
      const stored = await browser.storage.local.get(MMB_KEY);
      const entry = stored?.[MMB_KEY];
      if (entry?.url === location.href) {
        newTabIntent = true;
      } else if (entry) {
        // Stale flag from different page - clear it
        browser.storage.local.remove(MMB_KEY).catch(() => {});
      }
    } catch {}

    // --- MMB/Ctrl+click: prevent fullscreen on current page ---
    document.addEventListener(
      "mousedown",
      (e: MouseEvent) => {
        if (
          e.ctrlKey ||
          e.metaKey ||
          e.altKey ||
          e.button === 1
        ) {
          newTabIntent = true;
          // Persist to survive content script reloads.
          // Store URL so stale flags from previous pages are ignored.
          browser.storage.local
            .set({ [MMB_KEY]: { url: location.href, ts: Date.now() } })
            .catch(() => {});
          browser.runtime.sendMessage({ action: "setModifiers", ctrl: true });
        }
      },
      true,
    );

    // Reset on actual navigation
    window.addEventListener("popstate", () => {
      newTabIntent = false;
      browser.storage.local.remove(MMB_KEY).catch(() => {});
    });

    // Detect SPA navigation
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;
    history.pushState = function (...args) {
      origPushState.apply(this, args);
      newTabIntent = false;
      browser.storage.local.remove(MMB_KEY).catch(() => {});
    };
    history.replaceState = function (...args) {
      origReplaceState.apply(this, args);
      newTabIntent = false;
      browser.storage.local.remove(MMB_KEY).catch(() => {});
    };

    // --- Send F key when a NEW video starts playing ---
    document.addEventListener(
      "play",
      (e) => {
        if (!isEnabled || !autoFullscreenEnabled) return;
        if (newTabIntent) return;

        const video = e.target;
        if (!(video instanceof HTMLVideoElement)) return;
        // Only main player videos (not tiny ads/preloads)
        if (video.offsetWidth < 200 || video.offsetHeight < 150) return;

        setTimeout(() => {
          const src = video.currentSrc || video.src;
          if (!src) return;

          // Same video element = pause/play on existing video, skip
          if (video === lastFullscreenedVideo) return;

          // Only ENTER fullscreen, never EXIT
          if (document.fullscreenElement) return;

          // Different video element = new video, fullscreen
          lastFullscreenedVideo = video;

          // First video on page load → window fullscreen
          // Subsequent videos → F key (video player fullscreen)
          if (shouldAutoFullscreenOnLoad) {
            shouldAutoFullscreenOnLoad = false;
            browser.runtime.sendMessage({ action: "setWindowFullscreen" });
          } else {
            browser.runtime.sendMessage({ action: "sendFKey" });
          }
        }, 300);
      },
      true,
    );

    // --- Auto-fullscreen on initial load flag ---
    // Computed after all async operations, so newTabIntent is reliable.
    let shouldAutoFullscreenOnLoad =
      isEnabled && autoFullscreenEnabled && !newTabIntent;

    // --- Hide fullscreen exit instructions ---
    const style = document.createElement("style");
    style.textContent = `
      .Chrome-Full-Screen-Exit-Instruction { display: none !important; }
      .Full-Screen-Exit-Instruction { display: none !important; }
    `;
    document.head.appendChild(style);

    // --- Settings watcher (debounced) ---
    let settingsTimeout: ReturnType<typeof setTimeout> | null = null;
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      autoFullscreenEnabled = newValue.autoFullscreenEnabled;
      if (!isEnabled) {
        if (settingsTimeout) clearTimeout(settingsTimeout);
        settingsTimeout = setTimeout(() => {
          browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
        }, 100);
      }
    });
  },
});
