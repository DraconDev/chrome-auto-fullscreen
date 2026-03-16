import { defineBackground } from "wxt/sandbox";

export default defineBackground({
  main() {
    let ctrlHeld = false;
    let ctrlResetTimeout: ReturnType<typeof setTimeout> | null = null;

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "setModifiers") {
        ctrlHeld = message.ctrl || message.meta || false;
        return false;
      }

      if (message.action === "getModifierState") {
        sendResponse({ ctrlHeld });
        if (ctrlResetTimeout) clearTimeout(ctrlResetTimeout);
        // Keep modifier state alive for 10s so new tabs opened via Ctrl+click can read it
        ctrlResetTimeout = setTimeout(() => {
          ctrlHeld = false;
        }, 10000);
        return true;
      }

      if (message.action === "toggleWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state === "fullscreen") {
            chrome.windows.update(win.id, { state: "normal" });
          } else {
            chrome.windows.update(win.id, { state: "fullscreen" });
          }
        });
        return false;
      }

      if (message.action === "setWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          console.log("[AF BG] setWindowFullscreen, current state:", win.state);
          if (win.state !== "fullscreen") {
            chrome.windows.update(win.id, { state: "fullscreen" }, () => {
              console.log("[AF BG] entered fullscreen, error:", chrome.runtime.lastError?.message || "none");
            });
          }
        });
        return false;
      }

      if (message.action === "exitWindowFullscreen") {
        console.log("[AF BG] exitWindowFullscreen received, state:", "checking...");
        chrome.windows.getCurrent((win) => {
          console.log("[AF BG] window state:", win.state);
          if (win.id === undefined) return;
          if (win.state === "fullscreen") {
            chrome.windows.update(win.id, { state: "normal" }, () => {
              console.log("[AF BG] exited, error:", chrome.runtime.lastError?.message || "none");
            });
          }
        });
        return false;
      }

      return false;
    });
  },
});
