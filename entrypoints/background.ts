import { defineBackground } from "wxt/sandbox";

export default defineBackground({
  main() {
    let ctrlHeld = false;

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "setModifiers") {
        ctrlHeld = message.ctrl || message.meta || false;
        return;
      }

      if (message.action === "getModifierState") {
        sendResponse({ ctrlHeld });
        ctrlHeld = false;
        return true;
      }

      if (message.action === "sendFKey") {
        const tabId = sender.tab?.id;
        if (!tabId) return;

        chrome.debugger.attach({ tabId }, "1.3", () => {
          if (chrome.runtime.lastError) return;

          chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
            type: "keyDown",
            key: "f",
            code: "KeyF",
            windowsVirtualKeyCode: 70,
            nativeVirtualKeyCode: 70,
          });
          chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
            type: "keyUp",
            key: "f",
            code: "KeyF",
            windowsVirtualKeyCode: 70,
            nativeVirtualKeyCode: 70,
          });
          setTimeout(() => chrome.debugger.detach({ tabId }), 500);
        });
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
      }

      if (message.action === "setWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state !== "fullscreen") {
            chrome.windows.update(win.id, { state: "fullscreen" });
          }
        });
      }

      if (message.action === "exitWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state === "fullscreen") {
            chrome.windows.update(win.id, { state: "normal" });
          }
        });
      }
    });
  },
});
