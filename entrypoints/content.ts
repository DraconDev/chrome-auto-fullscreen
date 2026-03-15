import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;

    // --- New tab detection ---
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
    const checkModifiers = (e: KeyboardEvent) => {
      if (
        e.getModifierState("Control") ||
        e.getModifierState("Meta") ||
        e.getModifierState("Alt")
      ) {
        newTabIntent = true;
      }
    };
    document.addEventListener("keydown", checkModifiers, true);

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

    // BUG FIX: Reset newTabIntent on URL change (SPA navigation)
    // Without this, a single MMB/Ctrl+click disables fullscreen for the
    // entire page session, even after the user navigates to a new video.
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        newTabIntent = false;
      }
    });
    urlObserver.observe(document, { subtree: true, childList: true });

    // Also check on popstate (back/forward navigation)
    window.addEventListener("popstate", () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        newTabIntent = false;
      }
    });

    // --- Track last fullscreened video element ---
    let lastFullscreenedVideo: HTMLVideoElement | null = null;

    // --- MMB/Ctrl+click: mark this page to never fullscreen ---
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
          browser.runtime.sendMessage({ action: "setModifiers", ctrl: true });
        } else {
          browser.runtime.sendMessage({ action: "setModifiers", ctrl: false });
        }
      },
      true,
    );

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
          // Sending F when already fullscreen toggles it off, causing enter/exit spam
          if (document.fullscreenElement) return;

          // Different video element = new video, fullscreen
          lastFullscreenedVideo = video;

          browser.runtime.sendMessage({ action: "sendFKey" });
        }, 300);
      },
      true,
    );

    // --- Auto-fullscreen on initial load ---
    if (isEnabled && autoFullscreenEnabled && !newTabIntent) {
      const mainVideo = document.querySelector("video");
      if (mainVideo) {
        lastFullscreenedVideo = mainVideo;
      }
      browser.runtime.sendMessage({ action: "setWindowFullscreen" });
    }

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
        // Debounce to avoid rapid toggles from multiple setting changes
        if (settingsTimeout) clearTimeout(settingsTimeout);
        settingsTimeout = setTimeout(() => {
          browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
        }, 100);
      }
    });
  },
});
