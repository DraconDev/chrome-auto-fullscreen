import { defineBackground } from "wxt/sandbox";

export default defineBackground({
  main() {
    let ctrlHeld = false;
    let ctrlResetTimeout: ReturnType<typeof setTimeout> | null = null;

    // Track which tabs have debugger attached (avoid re-attaching = no notification spam)
    const debuggerAttached = new Set<number>();

    // Clean up when tabs close
    chrome.tabs.onRemoved.addListener((tabId) => {
      if (debuggerAttached.has(tabId)) {
        chrome.debugger.detach({ tabId }).catch(() => {});
        debuggerAttached.delete(tabId);
      }
    });

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

      if (message.action === "sendFKey") {
        const tabId = sender.tab?.id;
        if (!tabId) return false;

        const sendFKeyCommands = () => {
          chrome.debugger.sendCommand(
            { tabId },
            "Input.dispatchKeyEvent",
            {
              type: "keyDown",
              key: "f",
              code: "KeyF",
              windowsVirtualKeyCode: 70,
              nativeVirtualKeyCode: 70,
            },
            () => {
              chrome.debugger.sendCommand(
                { tabId },
                "Input.dispatchKeyEvent",
                {
                  type: "keyUp",
                  key: "f",
                  code: "KeyF",
                  windowsVirtualKeyCode: 70,
                  nativeVirtualKeyCode: 70,
                },
              );
            },
          );
        };

        if (debuggerAttached.has(tabId)) {
          // Already attached - just send keys (no notification)
          sendFKeyCommands();
        } else {
          // First time - attach (shows notification once), then send keys
          chrome.debugger.attach({ tabId }, "1.3", () => {
            if (chrome.runtime.lastError) return;
            debuggerAttached.add(tabId);
            sendFKeyCommands();
          });
        }
        return false;
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
          if (win.state !== "fullscreen") {
            chrome.windows.update(win.id, { state: "fullscreen" });
          }
        });
        return false;
      }

      if (message.action === "exitWindowFullscreen") {
        chrome.windows.getCurrent((win) => {
          if (win.id === undefined) return;
          if (win.state === "fullscreen") {
            chrome.windows.update(win.id, { state: "normal" });
          }
        });
        return false;
      }

      return false;
    });
  },
});
