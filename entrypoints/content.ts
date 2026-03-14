import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;

    // --- Detect new-tab intent (Ctrl+click, MMB) ---
    // The background stores this when the ORIGINAL tab's mousedown fires.
    // We query with retries because the background might not have received
    // the message yet when this new tab's content script loads.

    let newTabIntent = false;

    const checkNewTabIntent = async (): Promise<boolean> => {
      for (let i = 0; i < 5; i++) {
        const resp = await browser.runtime.sendMessage({
          action: "getModifierState",
        });
        if (resp?.ctrlHeld) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    };

    newTabIntent = await checkNewTabIntent();

    // Report future modifier changes to background (for OTHER new tabs)
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
    document.addEventListener(
      "mousedown",
      (e: MouseEvent) => {
        browser.runtime.sendMessage({
          action: "setModifiers",
          ctrl: !!(e.ctrlKey || e.metaKey || e.button === 1),
        });
      },
      true,
    );

    // --- Send F key when a new video starts playing ---
    // Uses document-level play event listener (no tag selectors needed).
    // play events bubble up from <video> elements.

    document.addEventListener("play", (e) => {
      if (!isEnabled || !autoFullscreenEnabled) return;
      if (newTabIntent) return;

      const video = e.target;
      if (!(video instanceof HTMLVideoElement)) return;
      // Only main player videos (not tiny ads/preloads)
      if (video.offsetWidth < 200 || video.offsetHeight < 150) return;

      // Small delay so currentSrc is populated
      setTimeout(() => {
        const src = video.currentSrc || video.src;
        if (!src) return;
        browser.runtime.sendMessage({ action: "sendFKey" });
      }, 300);
    }, true);

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
