import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;

    const initialPageUrl = location.href;

    // --- Detect new-tab intent ---
    // Current page: set on mousedown (Ctrl+click or MMB)
    // New tab: read from background on load (with retries for timing)

    let lastNewTabVideo: HTMLVideoElement | null = null;

    // New tab: query background for modifier state
    for (let i = 0; i < 5; i++) {
      const resp = await browser.runtime.sendMessage({
        action: "getModifierState",
      });
      if (resp?.ctrlHeld) {
        lastNewTabVideo = {} as HTMLVideoElement; // sentinel: skip first play
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

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

    // --- Track video clicks and new-tab intent ---
    let lastFullscreenedVideo: HTMLVideoElement | null = null;
    let lastFullscreenedSrc = "";
    let physicalModifiersHeld = false;

    document.addEventListener(
      "mousedown",
      (e: MouseEvent) => {
        // Walk up the DOM to find a video element
        let target = e.target as HTMLElement | null;
        while (target && !(target instanceof HTMLVideoElement)) {
          target = target.parentElement;
        }
        const video =
          target instanceof HTMLVideoElement ? target : null;

        // If MMB or Ctrl+click, remember the video to skip fullscreen on this page
        if (
          e.ctrlKey ||
          e.metaKey ||
          e.altKey ||
          e.button === 1
        ) {
          lastNewTabVideo = video;
          browser.runtime.sendMessage({ action: "setModifiers", ctrl: true });
        } else {
          browser.runtime.sendMessage({ action: "setModifiers", ctrl: false });
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

        const video = e.target;
        if (!(video instanceof HTMLVideoElement)) return;
        // Only main player videos (not tiny ads/preloads)
        if (video.offsetWidth < 200 || video.offsetHeight < 150) return;

        setTimeout(() => {
          const src = video.currentSrc || video.src;
          if (!src) return;

          // SAFETY: Skip if this video was opened via MMB/Ctrl+click
          if (video === lastNewTabVideo) return;

          // SAFETY: Skip if modifier keys are physically held right now
          // (catches race where new tab loads while Ctrl is still held)
          if (physicalModifiersHeld) return;

          // Detect new video:
          // - Element changed: different video element (new DOM node)
          // - Src changed: same element but different video content (SPA navigation)
          // - URL changed: page navigated
          // Skip only if element AND src are both unchanged (pause/play on same video).
          // Note: lastFullscreenedSrc is "" on first play after load, so srcChanged
          // will be true on first play - this is correct (first play = new video).
          const elementChanged = video !== lastFullscreenedVideo;
          const srcChanged =
            lastFullscreenedSrc !== "" && src !== lastFullscreenedSrc;
          const urlChanged = location.href !== initialPageUrl;

          // Same element AND same src AND same URL → pause/play on existing video, skip
          if (!elementChanged && !srcChanged && !urlChanged) return;

          // New video → fullscreen
          lastFullscreenedVideo = video;
          lastFullscreenedSrc = src;

          browser.runtime.sendMessage({ action: "sendFKey" });
        }, 300);
      },
      true,
    );

    // Track physical modifier key state
    document.addEventListener(
      "keydown",
      (e) => {
        if (
          e.getModifierState("Control") ||
          e.getModifierState("Meta") ||
          e.getModifierState("Alt")
        ) {
          physicalModifiersHeld = true;
        }
      },
      true,
    );
    document.addEventListener(
      "keyup",
      (e) => {
        if (
          !e.getModifierState("Control") &&
          !e.getModifierState("Meta") &&
          !e.getModifierState("Alt")
        ) {
          physicalModifiersHeld = false;
        }
      },
      true,
    );

    // --- Auto-fullscreen on initial load (window-level) ---

    if (isEnabled && autoFullscreenEnabled && !lastNewTabVideo) {
      // CRITICAL: Initialize tracking so pause→play on same video doesn't re-fullscreen
      const mainVideo = document.querySelector("video");
      if (mainVideo) {
        lastFullscreenedVideo = mainVideo;
        lastFullscreenedSrc = mainVideo.currentSrc || mainVideo.src || "";
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
