import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;
    let reEnterFullscreenOnNavigation = (await store.getValue()).reEnterFullscreenOnNavigation;

    // --- Modifier key tracking ---
    let ctrlHeld = false;
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) ctrlHeld = true;
    });
    document.addEventListener("keyup", (e) => {
      if (!e.ctrlKey && !e.metaKey) ctrlHeld = false;
    });
    window.addEventListener("blur", () => {
      ctrlHeld = false;
    });

    // --- Track if a video was playing before click ---
    let videoWasPlaying = false;

    document.addEventListener(
      "mousedown",
      () => {
        const video = document.querySelector("video");
        videoWasPlaying = !!video && !video.paused;
      },
      true,
    );

    // --- Auto-fullscreen on initial load ---
    if (isEnabled && autoFullscreenEnabled && !ctrlHeld) {
      const video = document.querySelector("video");
      if (video && !video.paused) {
        browser.runtime.sendMessage({ action: "setWindowFullscreen" });
      }
    }

    // --- Re-fullscreen on navigation ---

    const tryFullscreen = () => {
      if (ctrlHeld) return;
      if (!isEnabled || !autoFullscreenEnabled || !reEnterFullscreenOnNavigation) return;
      if (videoWasPlaying) return;
      if (document.fullscreenElement) return;
      browser.runtime.sendMessage({ action: "setWindowFullscreen" });
    };

    let lastPathname = location.pathname;

    // YouTube SPA navigation
    document.addEventListener("yt-navigate-finish", () => {
      if (location.pathname === lastPathname) return;
      lastPathname = location.pathname;

      // Video might not be loaded yet — poll until it starts playing
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const video = document.querySelector("video");
        if (video && !video.paused) {
          clearInterval(interval);
          tryFullscreen();
        }
        if (attempts > 20) clearInterval(interval);
      }, 250);
    });

    // Browser back/forward
    window.addEventListener("popstate", () => {
      if (location.pathname === lastPathname) return;
      lastPathname = location.pathname;
      setTimeout(tryFullscreen, 500);
    });

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
      reEnterFullscreenOnNavigation = newValue.reEnterFullscreenOnNavigation;
      if (!isEnabled) {
        browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
      }
    });
  },
});
