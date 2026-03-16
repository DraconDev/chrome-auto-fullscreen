import { defineBackground } from "wxt/sandbox";

export default defineBackground({
  main() {
    let ctrlHeld = false;
    // Don't reset immediately - use timeout to handle multi-tab race
    let ctrlResetTimeout: ReturnType<typeof setTimeout> | null = null;

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "setModifiers") {
        ctrlHeld = message.ctrl || message.meta || false;
        return false;
      }

      if (message.action === "getModifierState") {
        sendResponse({ ctrlHeld });
        // BUG FIX: Delay reset to handle multiple tabs opening simultaneously
        // and slow-loading content scripts. 3s gives plenty of time.
        if (ctrlResetTimeout) clearTimeout(ctrlResetTimeout);
        ctrlResetTimeout = setTimeout(() => {
          ctrlHeld = false;
        }, 3000);
        return true;
      }

      if (message.action === "sendFKey") {
        const tabId = sender.tab?.id;
        if (!tabId) return false;

        // BUG FIX: Wait for debugger attach to complete before sending keys
        chrome.debugger.attach({ tabId }, "1.3", () => {
          if (chrome.runtime.lastError) return;

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
                () => {
                  setTimeout(() => chrome.debugger.detach({ tabId }), 500);
                },
              );
            },
          );
        });
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
