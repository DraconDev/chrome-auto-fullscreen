import { defineBackground } from "wxt/sandbox";

export default defineBackground({
  main() {
    let ctrlHeld = false;
    let ctrlResetTimeout: ReturnType<typeof setTimeout> | null = null;

    const debuggerAttached = new Set<number>();
    chrome.tabs.onRemoved.addListener((tabId) => {
      debuggerAttached.delete(tabId);
    });

    // Save window bounds before fullscreen so we can restore on exit
    interface WinBounds { top: number; left: number; width: number; height: number; }
    const savedBounds = new Map<number, WinBounds>();

    const saveBounds = (win: chrome.windows.Window) => {
      if (win.id === undefined) return;
      if (win.top !== undefined && win.left !== undefined && win.width !== undefined && win.height !== undefined) {
        savedBounds.set(win.id, { top: win.top, left: win.left, width: win.width, height: win.height });
        console.log("[AF BG] saved bounds for win", win.id, win.left, win.top, win.width, win.height);
      }
    };

    const restoreBounds = (winId: number) => {
      const b = savedBounds.get(winId);
      if (b) {
        savedBounds.delete(winId);
        console.log("[AF BG] restoring bounds for win", winId, b);
        chrome.windows.update(winId, { state: "normal", top: b.top, left: b.left, width: b.width, height: b.height });
      } else {
        console.log("[AF BG] no saved bounds for win", winId);
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

      if (message.action === "sendFKey") {
        const tabId = sender.tab?.id;
        if (!tabId) return false;

        console.log("[AF BG] sendFKey for tab", tabId);

        const sendKey = () => {
          console.log("[AF BG] sending F key to tab", tabId);
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
          console.log("[AF BG] attaching debugger to tab", tabId, "- watch for Chrome notification!");
          chrome.debugger.attach({ tabId }, "1.3", () => {
            if (chrome.runtime.lastError) {
              console.log("[AF BG] debugger attach FAILED:", chrome.runtime.lastError.message);
              return;
            }
            console.log("[AF BG] debugger attached OK");
            debuggerAttached.add(tabId);
            sendKey();
          });
        }
        return false;
      }

      if (message.action === "toggleWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state === "fullscreen") {
            restoreBounds(win.id);
          } else {
            saveBounds(win);
            chrome.windows.update(win.id, { state: "fullscreen" });
          }
        });
        return false;
      }

      if (message.action === "setWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined || win.state === "fullscreen") return;
          saveBounds(win);
          console.log("[AF BG] entering fullscreen for win", win.id);
          chrome.windows.update(win.id, { state: "fullscreen" });
        });
        return false;
      }

      if (message.action === "exitWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined || win.state !== "fullscreen") return;
          console.log("[AF BG] exiting fullscreen for win", win.id);
          restoreBounds(win.id);
        });
        return false;
      }

      return false;
    });
  },
});
