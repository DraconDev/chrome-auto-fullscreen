import { defineBackground } from "wxt/sandbox";

export default defineBackground({
  main() {
    // Track modifier key state globally (shared across tabs).
    // Updated by content scripts on keydown/keyup/click.
    let ctrlHeld = false;

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Content script reports modifier state
      if (message.action === "setModifiers") {
        ctrlHeld = message.ctrl || message.meta || false;
        return;
      }

      // New tab queries modifier state (check-and-clear)
      if (message.action === "getModifierState") {
        sendResponse({ ctrlHeld });
        ctrlHeld = false;
        return true;
      }

      // Send F key to trigger fullscreen
      if (message.action === "sendFKey") {
        const tabId = sender.tab?.id;
        if (!tabId) return;

        // Try debugger API first (real keypress, YouTube handles it natively)
        chrome.debugger.attach({ tabId }, "1.3", () => {
          if (chrome.runtime.lastError) {
            // Debugger not available — fall back to player API
            fallbackFullscreen(tabId);
            return;
          }
          // Send F keydown
          chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
            type: "keyDown",
            key: "f",
            code: "KeyF",
            windowsVirtualKeyCode: 70,
            nativeVirtualKeyCode: 70,
          });
          // Send F keyup
          chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
            type: "keyUp",
            key: "f",
            code: "KeyF",
            windowsVirtualKeyCode: 70,
            nativeVirtualKeyCode: 70,
          });
          // Detach debugger after a short delay
          setTimeout(() => {
            chrome.debugger.detach({ tabId });
          }, 500);
        });
      }
    });

    function fallbackFullscreen(tabId: number) {
      chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN",
        func: () => {
          const player =
            document.querySelector("#movie_player") ||
            document.querySelector(".html5-video-player");
          if (player) {
            const methods = [
              "toggleFullscreen",
              "setFullscreen",
              "enterFullscreen",
            ];
            for (const m of methods) {
              if (typeof (player as any)[m] === "function") {
                (player as any)[m](true);
                return;
              }
            }
          }
        },
      });
    }
  },
});
