import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;

    // --- Detect new-tab intent ---
    // Current page: set on mousedown (Ctrl+click or MMB)
    // New tab: read from background on load (with retries for timing)

    let newTabIntent = false;

    // New tab: query background for modifier state
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

    // Check if modifier keys are physically held RIGHT NOW
    // (covers race where keydown fires before content script loads, or
    // where new tab loads while modifier is still held)
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

    // On mousedown: if Ctrl/Meta/Alt/MMB, this page should NOT fullscreen anything
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

    // --- Track which video the user clicked ---
    let lastFullscreenedVideo: HTMLVideoElement | null = null;
    let lastFullscreenedSrc = "";

    document.addEventListener(
      "mousedown",
      (e: MouseEvent) => {
        // Walk up the DOM to find a video element (click might be on a child/control)
        let target = e.target as HTMLElement | null;
        while (target && !(target instanceof HTMLVideoElement)) {
          target = target.parentElement;
        }
        if (target instanceof HTMLVideoElement) {
          lastFullscreenedVideo = target;
        }
      },
      true,
    );

    // --- Send F key when a NEW video starts playing ---
    // Uses document-level play event (bubbles from <video>, works across Shadow DOM).

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

          // On SPA sites (like Odysee), the same video element might be reused
          // with a new src. Track both element and src to detect new videos.
          const sameElement = video === lastFullscreenedVideo;
          const sameSrc = src === lastFullscreenedSrc;

          // Same element AND same src → pause/play on same video, skip
          if (sameElement && sameSrc) return;

          // Update tracking and fullscreen
          lastFullscreenedVideo = video;
          lastFullscreenedSrc = src;

          browser.runtime.sendMessage({ action: "sendFKey" });
        }, 300);
      },
      true,
    );

    // --- Auto-fullscreen on initial load (window-level) ---

    if (isEnabled && autoFullscreenEnabled && !newTabIntent) {
      browser.runtime.sendMessage({ action: "setWindowFullscreen" });
    }

    // --- Hide fullscreen exit instructions ---

    const style = document.createElement("style");
    style.textContent = `
      .Chrome-Full-Screen-Exit-Instruction { display: none !important; }
      .Full-Screen-Exit-Instruction { display: none !important; }
    `;
    document.head.appendChild(style);

    // --- Settings watcher ---

    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      autoFullscreenEnabled = newValue.autoFullscreenEnabled;
      if (!isEnabled) {
        browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
      }
    });
  },
});
