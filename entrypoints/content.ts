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

    // --- Auto-fullscreen on initial load ---
    if (isEnabled && autoFullscreenEnabled && !ctrlHeld) {
      browser.runtime.sendMessage({ action: "setWindowFullscreen" });
    }

    // --- Re-fullscreen on navigation ---
    // Uses window-level fullscreen via background script.
    // Element fullscreen (video.requestFullscreen) requires a user gesture,
    // which is not available during automatic navigation detection.

    const onNavigate = () => {
      if (ctrlHeld) return;
      if (isEnabled && autoFullscreenEnabled && reEnterFullscreenOnNavigation) {
        browser.runtime.sendMessage({ action: "setWindowFullscreen" });
      }
    };

    let lastPathname = location.pathname;

    // YouTube SPA navigation (only fires on real page transitions)
    document.addEventListener("yt-navigate-finish", () => {
      if (location.pathname !== lastPathname) {
        lastPathname = location.pathname;
        onNavigate();
      }
    });

    // Standard browser navigation (back/forward)
    window.addEventListener("popstate", () => {
      if (location.pathname !== lastPathname) {
        lastPathname = location.pathname;
        onNavigate();
      }
    });

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
      if (!isEnabled) {
        browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
      }
    });
  },
});
