import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

const log = (...args: unknown[]) => console.log("[AF]", ...args);

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    log("content script loading...");
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;
    let oneWayFullscreen = (await store.getValue()).oneWayFullscreen;
    let autoFullscreenOnNewVideo = (await store.getValue()).autoFullscreenOnNewVideo;
    let strictSafety = (await store.getValue()).strictSafety;
    let longPressDelay = (await store.getValue()).longPressDelay;
    let topEdgeExitEnabled = (await store.getValue()).topEdgeExitEnabled;
    let rippleEnabled = (await store.getValue()).rippleEnabled;
    let primaryColor = (await store.getValue()).primaryColor || "#00FFFF";
    log("loaded. enabled=", isEnabled, "delay=", longPressDelay);

    // --- State ---
    let newTabIntent = false;
    let lastFullscreenedVideo: HTMLVideoElement | null = null;
    let lastFullscreenedUrl = "";
    const MMB_KEY = "af_mmb_intent";

    // --- Register ALL event handlers FIRST ---

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

    // --- Top edge exit ---
    const TOP_EDGE_THRESHOLD = 5;
    document.addEventListener(
      "mousemove",
      (e: MouseEvent) => {
        if (!topEdgeExitEnabled) return;
        if (!isEnabled) return;
        if (oneWayFullscreen) return;
        if (e.clientY <= TOP_EDGE_THRESHOLD) {
          log("TOP EDGE HIT y=" + e.clientY + " - sending exitWindowFullscreen");
          browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
        }
      },
      true,
    );

    // --- Strict safety: check if target is interactive ---
    const isInteractive = (target: EventTarget | null): boolean => {
      if (!strictSafety) return false;
      const el = target as HTMLElement | null;
      if (!el) return false;
      // Walk up to find interactive ancestor
      let node: HTMLElement | null = el;
      while (node && node !== document.body) {
        const tag = node.tagName;
        if (
          tag === "A" ||
          tag === "BUTTON" ||
          tag === "INPUT" ||
          tag === "SELECT" ||
          tag === "TEXTAREA" ||
          tag === "LABEL" ||
          node.getAttribute("role") === "button" ||
          node.getAttribute("role") === "link" ||
          node.isContentEditable
        ) {
          log("interactive element blocked:", tag, node);
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    // --- Charge ring ---
    let chargeTimer: ReturnType<typeof setTimeout> | null = null;
    let chargeStartX = 0;
    let chargeStartY = 0;
    let chargeCompleted = false;
    let chargeRingEl: HTMLDivElement | null = null;
    let chargeRingAnim: number | null = null;
    const CHARGE_RING_SIZE = 44;
    const CHARGE_RING_STROKE = 3;

    const showChargeRing = (x: number, y: number, duration: number) => {
      removeChargeRing();
      if (!rippleEnabled) return;

      const el = document.createElement("div");
      const size = CHARGE_RING_SIZE;
      const r = (size - CHARGE_RING_STROKE * 2) / 2;
      const cx = size / 2;
      const circumference = 2 * Math.PI * r;

      el.style.cssText = `
        position:fixed;
        left:${x - size / 2}px;
        top:${y - size / 2}px;
        width:${size}px;
        height:${size}px;
        pointer-events:none;
        z-index:2147483647;
      `;
      el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${cx}" cy="${cx}" r="${r}" fill="none"
          stroke="rgba(255,255,255,0.15)" stroke-width="${CHARGE_RING_STROKE}"/>
        <circle class="af-ring" cx="${cx}" cy="${cx}" r="${r}" fill="none"
          stroke="${primaryColor}" stroke-width="${CHARGE_RING_STROKE}"
          stroke-linecap="round" stroke-dasharray="${circumference}"
          stroke-dashoffset="${circumference}"
          transform="rotate(-90 ${cx} ${cx})"/>
      </svg>`;

      document.body.appendChild(el);
      chargeRingEl = el;

      // Animate with rAF for smooth control
      const ring = el.querySelector(".af-ring") as SVGCircleElement | null;
      if (!ring) return;
      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        // Ease-out quad for smoother feel
        const eased = 1 - (1 - progress) * (1 - progress);
        ring.style.strokeDashoffset = String(circumference * (1 - eased));
        // Fade in opacity
        el.style.opacity = String(0.4 + eased * 0.5);
        if (progress < 1) {
          chargeRingAnim = requestAnimationFrame(tick);
        }
      };
      chargeRingAnim = requestAnimationFrame(tick);
    };

    const removeChargeRing = () => {
      if (chargeRingAnim) {
        cancelAnimationFrame(chargeRingAnim);
        chargeRingAnim = null;
      }
      if (chargeRingEl) {
        chargeRingEl.remove();
        chargeRingEl = null;
      }
    };

    const completeChargeRing = () => {
      if (chargeRingAnim) {
        cancelAnimationFrame(chargeRingAnim);
        chargeRingAnim = null;
      }
      if (chargeRingEl) {
        chargeRingEl.style.transition = "opacity 0.15s ease-out, transform 0.15s ease-out";
        chargeRingEl.style.opacity = "0";
        chargeRingEl.style.transform = "scale(1.3)";
        const el = chargeRingEl;
        setTimeout(() => el.remove(), 150);
        chargeRingEl = null;
      }
    };

    // --- Mousedown handler ---
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
        if (!isEnabled) return;
        if (e.button !== 0) return;
        if (isInteractive(e.target)) { log("blocked: interactive element"); return; }

        // Cancel any existing charge
        if (chargeTimer) {
          clearTimeout(chargeTimer);
          chargeTimer = null;
        }

        chargeStartX = e.clientX;
        chargeStartY = e.clientY;
        chargeCompleted = false;

        if (longPressDelay === 0) {
          // Instant mode
          chargeCompleted = true;
          browser.runtime.sendMessage({ action: "setWindowFullscreen" });
        } else {
          // Charge mode
          showChargeRing(e.clientX, e.clientY, longPressDelay);
          chargeTimer = setTimeout(() => {
            chargeTimer = null;
            chargeCompleted = true;
            completeChargeRing();
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
          removeChargeRing();
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
          removeChargeRing();
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

    // --- Play handler: auto-fullscreen new videos (SPA navigation signal) ---
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

        if (oneWayFullscreen && document.fullscreenElement) return;
        if (src === lastFullscreenedUrl) return;

        const elementChanged = video !== lastFullscreenedVideo;
        if (!elementChanged && !autoFullscreenOnNewVideo) return;

        lastFullscreenedVideo = video;
        lastFullscreenedUrl = src;
        browser.runtime.sendMessage({ action: "setWindowFullscreen" });
      },
      true,
    );

    // --- Async checks ---

    // Check background for modifier state
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

    // Check persisted MMB state
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
      topEdgeExitEnabled = newValue.topEdgeExitEnabled;
      rippleEnabled = newValue.rippleEnabled;
      primaryColor = newValue.primaryColor || "#00FFFF";
      if (!isEnabled) {
        if (settingsTimeout) clearTimeout(settingsTimeout);
        settingsTimeout = setTimeout(() => {
          browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
        }, 100);
      }
    });
  },
});
