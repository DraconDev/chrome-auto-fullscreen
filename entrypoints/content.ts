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

    // Current page: also check if Ctrl is physically held right now
    // (covers race where keydown fires before content script loads)
    document.addEventListener("keydown", (e) => {
      if (e.getModifierState("Control") || e.getModifierState("Meta")) {
        newTabIntent = true;
      }
    });

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

    // On mousedown: if Ctrl/MMB, this page should NOT fullscreen anything
    document.addEventListener(
      "mousedown",
      (e: MouseEvent) => {
        if (e.ctrlKey || e.metaKey || e.button === 1) {
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

    document.addEventListener(
      "mousedown",
      (e: MouseEvent) => {
        const video = e.target;
        if (video instanceof HTMLVideoElement) {
          lastFullscreenedVideo = video;
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
          // Don't re-fullscreen the same video element (e.g. pause → play on same video)
          if (video === lastFullscreenedVideo) return;
          lastFullscreenedVideo = video;

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
