import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

// Debug logging - visible in page console (F12)
const log = (...args: unknown[]) => console.log("[AF]", ...args);

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;
    let oneWayFullscreen = (await store.getValue()).oneWayFullscreen;
    let autoFullscreenOnNewVideo = (await store.getValue()).autoFullscreenOnNewVideo;
    let strictSafety = (await store.getValue()).strictSafety;
    let longPressDelay = (await store.getValue()).longPressDelay;

    // --- State ---
    let newTabIntent = false;
    let lastFullscreenedVideo: HTMLVideoElement | null = null;
    let lastFullscreenedUrl = "";
    const MMB_KEY = "af_mmb_intent";

    // --- Register ALL event handlers FIRST (synchronous, before any async) ---

    // Physical modifier key detection
    document.addEventListener(
      "keydown",
      (e) => {
        if (
          e.getModifierState("Control") ||
          e.getModifierState("Meta") ||
          e.getModifierState("Alt")
        ) {
          newTabIntent = true;
        }
      },
      true,
    );

    // Report modifier state to background (for new tabs to read)
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        browser.runtime.sendMessage({ action: "setModifiers", ctrl: true });
      }
    });
    document.addEventListener("keyup", (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        browser.runtime.sendMessage({ action: "setModifiers", ctrl: false });
      }
    });

    // --- Combined mousedown: MMB/Ctrl+click detection + charge timer ---
    let chargeTimer: ReturnType<typeof setTimeout> | null = null;
    let chargeStartX = 0;
    let chargeStartY = 0;
    let chargeCompleted = false;

    document.addEventListener(
      "mousedown",
      (e: MouseEvent) => {
        // Check for MMB/Ctrl+click (new tab intent)
        const hasModifier =
          e.ctrlKey ||
          e.metaKey ||
          e.altKey ||
          e.button === 1 ||
          e.getModifierState("Control") ||
          e.getModifierState("Meta") ||
          e.getModifierState("Alt");

        if (hasModifier) {
          newTabIntent = true;
          browser.storage.local
            .set({ [MMB_KEY]: { url: location.href } })
            .catch(() => {});
          browser.runtime.sendMessage({ action: "setModifiers", ctrl: true });
          return;
        }

        // --- Charge / long-press to fullscreen ---
        if (!isEnabled) { log("blocked: isEnabled=false"); return; }
        if (e.button !== 0) { log("blocked: not left click, button=", e.button); return; }

        // Find video: try DOM walk first, then elementFromPoint as fallback
        let clickedVideo: HTMLVideoElement | null = null;

        // Method 1: Walk up from click target
        let el = e.target as HTMLElement | null;
        while (el && el !== document.body) {
          if (el instanceof HTMLVideoElement) {
            clickedVideo = el;
            break;
          }
          el = el.parentElement;
        }

        // Method 2: If not found, check if there's a video at the click position
        if (!clickedVideo) {
          const pointEl = document.elementFromPoint(e.clientX, e.clientY);
          let pel = pointEl as HTMLElement | null;
          while (pel && pel !== document.body) {
            if (pel instanceof HTMLVideoElement) {
              clickedVideo = pel;
              break;
            }
            pel = pel.parentElement;
          }
          // Also check if elementFromPoint directly IS a video
          if (!clickedVideo && pointEl instanceof HTMLVideoElement) {
            clickedVideo = pointEl;
          }
        }

        if (!clickedVideo) {
          log("blocked: no video found. target=", e.target?.constructor.name, 
              "tag=", (e.target as HTMLElement)?.tagName);
          return;
        }
        if (clickedVideo.offsetWidth < 300 || clickedVideo.offsetHeight < 200) {
          log("blocked: video too small", clickedVideo.offsetWidth, "x", clickedVideo.offsetHeight);
          return;
        }

        log("video found! size=", clickedVideo.offsetWidth, "x", clickedVideo.offsetHeight,
            "delay=", longPressDelay, "fullscreen=", !!document.fullscreenElement);

        // Cancel any existing charge
        if (chargeTimer) {
          clearTimeout(chargeTimer);
          chargeTimer = null;
        }

        chargeStartX = e.clientX;
        chargeStartY = e.clientY;
        chargeCompleted = false;

        if (longPressDelay === 0) {
          // Instant mode - gesture is alive, requestFullscreen works directly
          chargeCompleted = true;
          log("instant: calling requestFullscreen()");
          if (!document.fullscreenElement && clickedVideo.requestFullscreen) {
            clickedVideo.requestFullscreen()
              .then(() => log("requestFullscreen SUCCESS"))
              .catch((err) => log("requestFullscreen FAILED:", err));
          }
        } else {
          // Charge mode - user holds mouse, wait for delay then fullscreen window
          log("charge: starting timer, delay=", longPressDelay);
          chargeTimer = setTimeout(() => {
            chargeTimer = null;
            chargeCompleted = true;
            log("charge: timer fired, sending setWindowFullscreen");
            browser.runtime.sendMessage({ action: "setWindowFullscreen" });
          }, longPressDelay);
        }
      },
      true,
    );

    // Cancel charge if mouse moves too far
    document.addEventListener(
      "mousemove",
      (e: MouseEvent) => {
        if (!chargeTimer) return;
        const dx = Math.abs(e.clientX - chargeStartX);
        const dy = Math.abs(e.clientY - chargeStartY);
        if (dx > 50 || dy > 50) {
          clearTimeout(chargeTimer);
          chargeTimer = null;
        }
      },
      true,
    );

    // Cancel charge if mouse released before timer
    document.addEventListener(
      "mouseup",
      () => {
        if (chargeTimer) {
          clearTimeout(chargeTimer);
          chargeTimer = null;
        }
      },
      true,
    );

    // Navigation resets
    window.addEventListener("popstate", () => {
      newTabIntent = false;
      browser.storage.local.remove(MMB_KEY).catch(() => {});
    });
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;
    history.pushState = function (...args) {
      origPushState.apply(this, args);
      newTabIntent = false;
      browser.storage.local.remove(MMB_KEY).catch(() => {});
    };
    history.replaceState = function (...args) {
      origReplaceState.apply(this, args);
      newTabIntent = false;
      browser.storage.local.remove(MMB_KEY).catch(() => {});
    };
    window.addEventListener("beforeunload", () => {
      browser.storage.local.remove(MMB_KEY).catch(() => {});
    });

    // --- Play handler: auto-fullscreen new videos ---
    document.addEventListener(
      "play",
      (e) => {
        if (!isEnabled || !autoFullscreenEnabled) return;
        if (newTabIntent) return;

        const video = e.target;
        if (!(video instanceof HTMLVideoElement)) return;
        if (video.offsetWidth < 200 || video.offsetHeight < 150) return;

        const src = video.currentSrc || video.src;
        if (!src) return;

        // One-way fullscreen: never EXIT fullscreen
        if (oneWayFullscreen && document.fullscreenElement) return;

        // Skip if same video (pause → play)
        if (src === lastFullscreenedUrl) return;

        // Skip if same video element and SPA nav not enabled
        const elementChanged = video !== lastFullscreenedVideo;
        if (!elementChanged && !autoFullscreenOnNewVideo) return;

        lastFullscreenedVideo = video;
        lastFullscreenedUrl = src;
        browser.runtime.sendMessage({ action: "setWindowFullscreen" });
      },
      true,
    );

    // --- Async checks (handlers are already registered above) ---

    // Check background for modifier state (new tab detection)
    for (let i = 0; i < 5; i++) {
      const resp = await browser.runtime.sendMessage({
        action: "getModifierState",
      });
      if (resp?.ctrlHeld) {
        newTabIntent = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    // Check persisted MMB state (survives content script reloads)
    try {
      const stored = await browser.storage.local.get(MMB_KEY);
      const entry = stored?.[MMB_KEY];
      if (entry?.url === location.href) {
        newTabIntent = true;
      } else if (entry) {
        browser.storage.local.remove(MMB_KEY).catch(() => {});
      }
    } catch {}

    // --- Auto-fullscreen on initial load ---
    if (isEnabled && autoFullscreenEnabled && !newTabIntent) {
      const mainVideo = document.querySelector("video");
      if (mainVideo) {
        lastFullscreenedVideo = mainVideo;
        lastFullscreenedUrl = mainVideo.currentSrc || mainVideo.src || "";
      }
      browser.runtime.sendMessage({ action: "setWindowFullscreen" });
    }

    // --- Hide fullscreen exit instructions ---
    const style = document.createElement("style");
    style.textContent = `
      .Chrome-Full-Screen-Exit-Instruction { display: none !important; }
      .Full-Screen-Exit-Instruction { display: none !important; }
    `;
    document.head.appendChild(style);

    // --- Settings watcher ---
    let settingsTimeout: ReturnType<typeof setTimeout> | null = null;
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      autoFullscreenEnabled = newValue.autoFullscreenEnabled;
      oneWayFullscreen = newValue.oneWayFullscreen;
      autoFullscreenOnNewVideo = newValue.autoFullscreenOnNewVideo;
      strictSafety = newValue.strictSafety;
      longPressDelay = newValue.longPressDelay;
      if (!isEnabled) {
        if (settingsTimeout) clearTimeout(settingsTimeout);
        settingsTimeout = setTimeout(() => {
          browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
        }, 100);
      }
    });
  },
});
