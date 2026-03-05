import { defineBackground } from "wxt/sandbox";

export default defineBackground({
  main() {
    let lastNonFullscreenState: chrome.windows.WindowState = "maximized";

    browser.runtime.onMessage.addListener((message) => {
      if (message.action === "toggleWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state === "fullscreen") {
            chrome.windows.update(win.id, {
              state: lastNonFullscreenState || "maximized",
            });
          } else {
            lastNonFullscreenState = win.state || "maximized";
            chrome.windows.update(win.id, { state: "fullscreen" });
          }
        });
      } else if (message.action === "setWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state !== "fullscreen") {
            lastNonFullscreenState = win.state || "maximized";
            chrome.windows.update(win.id, { state: "fullscreen" });
          }
        });
      } else if (message.action === "exitWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state === "fullscreen") {
            chrome.windows.update(win.id, {
              state: lastNonFullscreenState || "maximized",
            });
          }
        });
      }
    });
  },
});
