import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;

    // --- Report modifier keys to background (shared across tabs) ---

    const reportModifiers = (e: KeyboardEvent | MouseEvent) => {
      browser.runtime.sendMessage({
        action: "setModifiers",
        ctrl: e.ctrlKey,
        meta: e.metaKey,
      });
    };

    document.addEventListener("keydown", reportModifiers);
    document.addEventListener("keyup", reportModifiers);

    // On click: report current modifier state. This runs in capture phase
    // so it fires BEFORE any page click handlers.
    document.addEventListener(
      "mousedown",
      (e) => {
        reportModifiers(e);
      },
      true,
    );

    // --- Auto-fullscreen on initial load ---
    // Queries background for modifier state (handles Ctrl+click opening new tab).

    if (isEnabled && autoFullscreenEnabled) {
      const resp = await browser.runtime.sendMessage({
        action: "getModifierState",
      });
      if (!resp?.ctrlHeld) {
        browser.runtime.sendMessage({ action: "setWindowFullscreen" });
      }
    }

    // --- Send F key on YouTube video navigation ---

    const onYouTubeNav = async () => {
      if (!isEnabled || !autoFullscreenEnabled) return;
      const resp = await browser.runtime.sendMessage({
        action: "getModifierState",
      });
      if (resp?.ctrlHeld) return;
      browser.runtime.sendMessage({ action: "sendFKey" });
    };

    document.addEventListener("yt-navigate-finish", onYouTubeNav);

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
