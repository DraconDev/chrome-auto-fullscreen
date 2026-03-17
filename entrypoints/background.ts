import { defineBackground } from "wxt/sandbox";

export default defineBackground({
  main() {
    let ctrlHeld = false;
    let ctrlResetTimeout: ReturnType<typeof setTimeout> | null = null;

    // Save window bounds before fullscreen so we can restore on exit
    const savedBounds = new Map<number, { top: number; left: number; width: number; height: number }>();

    const saveBounds = (win: chrome.windows.Window) => {
      if (win.id === undefined) return;
      if (win.top !== undefined && win.left !== undefined && win.width !== undefined && win.height !== undefined) {
        savedBounds.set(win.id, { top: win.top, left: win.left, width: win.width, height: win.height });
      }
    };

    const restoreBounds = (winId: number) => {
      const b = savedBounds.get(winId);
      if (b) {
        savedBounds.delete(winId);
        chrome.windows.update(winId, { state: "normal", top: b.top, left: b.left, width: b.width, height: b.height });
      } else {
        chrome.windows.update(winId, { state: "normal" });
      }
    };

    // Click extension icon → open settings page
    chrome.action.onClicked.addListener(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL("/settings.html") });
    });

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "setModifiers") {
        ctrlHeld = message.ctrl || message.meta || false;
        return false;
      }

      if (message.action === "getModifierState") {
        sendResponse({ ctrlHeld });
        if (ctrlResetTimeout) clearTimeout(ctrlResetTimeout);
        ctrlResetTimeout = setTimeout(() => { ctrlHeld = false; }, 10000);
        return true;
      }

      if (message.action === "setWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined || win.state === "fullscreen") return;
          saveBounds(win);
          chrome.windows.update(win.id, { state: "fullscreen" });
        });
        return false;
      }

      if (message.action === "exitWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined || win.state !== "fullscreen") return;
          restoreBounds(win.id);
        });
        return false;
      }

      return false;
    });
  },
});
