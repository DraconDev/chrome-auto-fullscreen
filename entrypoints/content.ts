import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;

    // --- New tab detection (for initial load) ---
    // New tabs query the background for modifier state set by the originating page
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
    const onKeydown = (e: KeyboardEvent) => {
      if (
        e.getModifierState("Control") ||
        e.getModifierState("Meta") ||
        e.getModifierState("Alt")
      ) {
        newTabIntent = true;
      }
    };
    document.addEventListener("keydown", onKeydown, true);

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

    // --- MMB/Ctrl+click: prevent fullscreen on current page ---
    // Only set to true on modifier/MMB click. Never reset on regular click
    // (was causing race: regular click within 300ms play delay cleared the flag).
    // Reset only on URL change (SPA navigation).

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
        }
        // NOTE: Do NOT reset on regular click - causes race with play handler's 300ms delay
      },
      true,
    );

    // Reset newTabIntent on URL change (SPA navigation or back/forward)
    let lastUrl = location.href;
    const checkUrlChange = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        newTabIntent = false;
      }
    };
    window.addEventListener("popstate", checkUrlChange);
    new MutationObserver(checkUrlChange).observe(document, {
      subtree: true,
      childList: true,
    });

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

          browser.runtime.sendMessage({ action: "sendFKey" });
        }, 300);
      },
      true,
    );

    // --- Auto-fullscreen on initial load ---
    // Use window fullscreen for initial page load (more reliable than F key
    // before video has loaded). Only trigger when a video actually starts
    // playing to ensure newTabIntent has been checked by then.
    let needsInitialFullscreen =
      isEnabled && autoFullscreenEnabled && !newTabIntent;

    // Watch for first video play to trigger window fullscreen
    const initialFullscreenObserver = new MutationObserver(() => {
      if (!needsInitialFullscreen) return;
      const video = document.querySelector("video");
      if (video && video.offsetWidth >= 200 && video.offsetHeight >= 150) {
        needsInitialFullscreen = false;
        lastFullscreenedVideo = video;
        browser.runtime.sendMessage({ action: "setWindowFullscreen" });
        initialFullscreenObserver.disconnect();
      }
    });
    initialFullscreenObserver.observe(document, {
      subtree: true,
      childList: true,
    });

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
