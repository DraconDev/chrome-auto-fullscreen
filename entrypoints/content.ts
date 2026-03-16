import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;

    // --- State ---
    let newTabIntent = false;
    let lastFullscreenedVideo: HTMLVideoElement | null = null;
    const MMB_KEY = "af_mmb_intent";

    // --- Register ALL event handlers FIRST (synchronous, before any async) ---
    // This ensures MMB/Ctrl+click is captured even if the content script
    // was just reloaded by Chrome under memory pressure.

    // Physical modifier key detection
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

    // MMB/Ctrl+click: prevent fullscreen on current page
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
          browser.storage.local
            .set({ [MMB_KEY]: { url: location.href } })
            .catch(() => {});
          browser.runtime.sendMessage({ action: "setModifiers", ctrl: true });
        }
      },
      true,
    );

    // Navigation resets
    window.addEventListener("popstate", () => {
      newTabIntent = false;
      browser.storage.local.remove(MMB_KEY).catch(() => {});
    });
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
    // Clear stale storage on page unload (regular link navigation)
    window.addEventListener("beforeunload", () => {
      browser.storage.local.remove(MMB_KEY).catch(() => {});
    });

    // Play handler: fullscreen new videos
    document.addEventListener(
      "play",
      (e) => {
        if (!isEnabled || !autoFullscreenEnabled) return;
        if (newTabIntent) return;

        const video = e.target;
        if (!(video instanceof HTMLVideoElement)) return;
        if (video.offsetWidth < 200 || video.offsetHeight < 150) return;

        setTimeout(() => {
          const src = video.currentSrc || video.src;
          if (!src) return;
          if (video === lastFullscreenedVideo) return;
          if (document.fullscreenElement) return;

          lastFullscreenedVideo = video;
          browser.runtime.sendMessage({ action: "sendFKey" });
        }, 300);
      },
      true,
    );

    // --- Now do all async checks (handlers are already registered above) ---

    // Check background for modifier state (new tab detection)
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

    // Check persisted MMB state (survives content script reloads)
    try {
      const stored = await browser.storage.local.get(MMB_KEY);
      const entry = stored?.[MMB_KEY];
      if (entry?.url === location.href) {
        newTabIntent = true;
      } else if (entry) {
        browser.storage.local.remove(MMB_KEY).catch(() => {});
      }
    } catch {}

    // --- Auto-fullscreen on initial load ---
    // Runs AFTER all async checks complete. By now, if the user MMB/Ctrl+clicked,
    // the mousedown handler has already set newTabIntent = true.
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
        if (settingsTimeout) clearTimeout(settingsTimeout);
        settingsTimeout = setTimeout(() => {
          browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
        }, 100);
      }
    });
  },
});
