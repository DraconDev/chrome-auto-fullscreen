import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;

    // --- New tab detection ---
    // New tab: query background for modifier state set by the originating page
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

          // CRITICAL: Only ENTER fullscreen, never EXIT
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
