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

    // --- Fullscreen on navigation: press F on a playing video ---

    const tryFullscreen = () => {
      if (!isEnabled || !autoFullscreenEnabled || ctrlHeld) return;
      const video = document.querySelector("video");
      if (video && !video.paused) {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "f",
            code: "KeyF",
            keyCode: 70,
            which: 70,
            bubbles: true,
          }),
        );
      }
    };

    // YouTube: wait for video to load after navigation, then press F
    const onYouTubeNav = () => {
      if (!isEnabled || !autoFullscreenEnabled || !reEnterFullscreenOnNavigation || ctrlHeld) return;
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const video = document.querySelector("video");
        if (video && !video.paused) {
          clearInterval(interval);
          document.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "f",
              code: "KeyF",
              keyCode: 70,
              which: 70,
              bubbles: true,
            }),
          );
        }
        if (attempts > 20) clearInterval(interval);
      }, 250);
    };

    document.addEventListener("yt-navigate-finish", onYouTubeNav);

    window.addEventListener("popstate", () => {
      if (reEnterFullscreenOnNavigation) {
        setTimeout(tryFullscreen, 500);
      }
    });

    // Initial load: press F if video is already playing
    if (isEnabled && autoFullscreenEnabled && !ctrlHeld) {
      setTimeout(tryFullscreen, 500);
    }

    // --- Hide fullscreen exit instructions ---

    const style = document.createElement("style");
    style.textContent = `
      .Chrome-Full-Screen-Exit-Instruction { display: none !important; }
      .Full-Screen-Exit-Instruction { display: none !important; }
      div[class*="fullscreen-exit"],
      div[class*="fullscreen-notification"],
      div[id*="fullscreen-exit"],
      div[id*="fullscreen-notification"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // --- Settings watcher ---

    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      autoFullscreenEnabled = newValue.autoFullscreenEnabled;
      reEnterFullscreenOnNavigation = newValue.reEnterFullscreenOnNavigation;
    });
  },
});
