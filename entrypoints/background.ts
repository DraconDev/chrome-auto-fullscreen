import { defineBackground } from "wxt/sandbox";

export default defineBackground({
  main() {
    let ctrlHeld = false;
    let ctrlResetTimeout: ReturnType<typeof setTimeout> | null = null;

    const debuggerAttached = new Set<number>();
    chrome.tabs.onRemoved.addListener((tabId) => {
      debuggerAttached.delete(tabId);
    });

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

      if (message.action === "sendFKey") {
        const tabId = sender.tab?.id;
        if (!tabId) return false;

        const sendKey = () => {
          chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent",
            { type: "keyDown", key: "f", code: "KeyF", windowsVirtualKeyCode: 70, nativeVirtualKeyCode: 70 },
            () => {
              chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent",
                { type: "keyUp", key: "f", code: "KeyF", windowsVirtualKeyCode: 70, nativeVirtualKeyCode: 70 });
            });
        };

        if (debuggerAttached.has(tabId)) {
          sendKey();
        } else {
          chrome.debugger.attach({ tabId }, "1.3", () => {
            if (chrome.runtime.lastError) return;
            debuggerAttached.add(tabId);
            sendKey();
          });
        }
        return false;
      }

      if (message.action === "toggleWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          chrome.windows.update(win.id, {
            state: win.state === "maximized" ? "normal" : "maximized",
          });
        });
        return false;
      }

      if (message.action === "setWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined || win.state === "maximized") return;
          chrome.windows.update(win.id, { state: "maximized" });
        });
        return false;
      }

      if (message.action === "exitWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined || win.state !== "maximized") return;
          chrome.windows.update(win.id, { state: "normal" });
        });
        return false;
      }

      return false;
    });
  },
});
