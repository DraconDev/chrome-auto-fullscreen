import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;

    // --- Track new-tab intent (Ctrl+click or MMB) via background ---

    const reportNewTabIntent = (e: MouseEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const mmb = e.button === 1;
      if (ctrl || mmb) {
        browser.runtime.sendMessage({ action: "setModifiers", ctrl: true });
      } else {
        browser.runtime.sendMessage({ action: "setModifiers", ctrl: false });
      }
    };

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
    // Capture phase so we fire BEFORE the browser opens a new tab
    document.addEventListener("mousedown", reportNewTabIntent, true);

    // --- Send F key when a new video starts playing ---

    let lastVideoSrc = "";

    const onVideoPlay = async (video: HTMLVideoElement) => {
      if (!isEnabled || !autoFullscreenEnabled) return;
      // Only fullscreen main player videos (not tiny ads/thumbnails)
      if (video.offsetWidth < 200 || video.offsetHeight < 150) return;
      const src = video.currentSrc || video.src;
      if (!src || src === lastVideoSrc) return;
      lastVideoSrc = src;

      const resp = await browser.runtime.sendMessage({
        action: "getModifierState",
      });
      if (resp?.ctrlHeld) return;

      browser.runtime.sendMessage({ action: "sendFKey" });
    };

    // Listen for play events on all current and future videos
    const attachPlayListener = (video: HTMLVideoElement) => {
      video.addEventListener("play", () => onVideoPlay(video));
    };

    document.querySelectorAll("video").forEach(attachPlayListener);

    // Watch for new video elements added to the DOM
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLVideoElement) {
            attachPlayListener(node);
          } else if (node instanceof Element) {
            node.querySelectorAll("video").forEach(attachPlayListener);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // --- Auto-fullscreen on initial load (window-level) ---

    if (isEnabled && autoFullscreenEnabled) {
      const resp = await browser.runtime.sendMessage({
        action: "getModifierState",
      });
      if (!resp?.ctrlHeld) {
        browser.runtime.sendMessage({ action: "setWindowFullscreen" });
      }
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
