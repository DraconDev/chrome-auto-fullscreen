import { defineBackground } from "wxt/sandbox";

export default defineBackground({
  main() {
    let savedBounds: chrome.windows.UpdateInfo | null = null;

    const saveBounds = (win: chrome.windows.Window) => {
      if (win.state === "fullscreen") return;
      savedBounds = {
        state: win.state === "maximized" ? "maximized" : "normal",
        left: win.left,
        top: win.top,
        width: win.width,
        height: win.height,
      };
    };

    const restoreWindow = (winId: number) => {
      if (savedBounds && savedBounds.state === "maximized") {
        chrome.windows.update(winId, { state: "maximized" });
      } else if (savedBounds && savedBounds.width && savedBounds.height) {
        chrome.windows.update(winId, {
          state: "normal",
          left: savedBounds.left,
          top: savedBounds.top,
          width: savedBounds.width,
          height: savedBounds.height,
        });
      } else {
        chrome.windows.update(winId, { state: "normal" });
      }
    };

    browser.runtime.onMessage.addListener((message) => {
      if (message.action === "toggleWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state === "fullscreen") {
            restoreWindow(win.id);
          } else {
            saveBounds(win);
            chrome.windows.update(win.id, { state: "fullscreen" });
          }
        });
      } else if (message.action === "setWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state !== "fullscreen") {
            saveBounds(win);
            chrome.windows.update(win.id, { state: "fullscreen" });
          }
        });
      } else if (message.action === "exitWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state === "fullscreen") {
            restoreWindow(win.id);
          }
        });
      }
    });
  },
});
