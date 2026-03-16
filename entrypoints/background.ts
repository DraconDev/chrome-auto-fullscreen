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
        ctrlResetTimeout = setTimeout(() => {
          ctrlHeld = false;
        }, 3000);
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
        console.log("[AF BG] setWindowFullscreen received");
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state !== "fullscreen") {
            chrome.windows.update(win.id, { state: "fullscreen" }, () => {
              console.log("[AF BG] entered fullscreen");
            });
          }
        });
        return false;
      }

      if (message.action === "exitWindowFullscreen") {
        console.log("[AF BG] exitWindowFullscreen received");
        chrome.windows.getCurrent((win) => {
          console.log("[AF BG] current window state:", win.state);
          if (win.id === undefined) return;
          if (win.state === "fullscreen") {
            chrome.windows.update(win.id, { state: "normal" }, () => {
              console.log("[AF BG] exited fullscreen");
            });
          }
        });
        return false;
      }

      return false;
    });
  },
});
