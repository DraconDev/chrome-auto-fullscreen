import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

const MODIFIER_KEY = "af_modifier";
const MODIFIER_TTL = 15000;

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    const s = await store.getValue();
    let isEnabled = s.enabled;
    let autoFullscreenEnabled = s.autoFullscreenEnabled;
    let neverAutoExit = s.oneWayFullscreen;
    let autoFullscreenOnNewVideo = s.autoFullscreenOnNewVideo;
    let strictSafety = s.strictSafety;
    let longPressDelay = s.longPressDelay;
    let topEdgeExitEnabled = s.topEdgeExitEnabled;
    let rippleEnabled = s.rippleEnabled;
    let primaryColor = s.primaryColor || "#00FFFF";
    let videoFullscreen = s.fullscreenVideo;

    // --- State ---
    let newTabIntent = false;
    let lastFullscreenedVideo: HTMLVideoElement | null = null;
    let lastFullscreenedUrl = "";
    const MMB_KEY = "af_mmb_intent";

    const findMainVideo = (): HTMLVideoElement | null => {
      const videos = document.querySelectorAll("video");
      let best: HTMLVideoElement | null = null;
      let bestArea = 0;
      for (const v of videos) {
        const area = v.offsetWidth * v.offsetHeight;
        if (area > bestArea && v.offsetWidth >= 200 && v.offsetHeight >= 150) {
          best = v;
          bestArea = area;
        }
      }
      return best;
    };

    // --- Fullscreen state tracking (chrome.windows.update doesn't set document.fullscreenElement) ---
    let isFullscreen = false;

    // --- Send F key to fullscreen the video element ---
    const sendFKey = () => {
      if (videoFullscreen) browser.runtime.sendMessage({ action: "sendFKey" });
    };

    // --- Enter fullscreen: window + video ---
    const enterFullscreen = () => {
      isFullscreen = true;
      browser.runtime.sendMessage({ action: "setWindowFullscreen" });
      sendFKey();
    };

    // --- Exit fullscreen: window ---
    const exitFullscreen = () => {
      isFullscreen = false;
      browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
    };

    // --- Persist modifier state ---
    const saveModifierState = (active: boolean) => {
      if (active) {
        browser.storage.local.set({ [MODIFIER_KEY]: { ts: Date.now() } }).catch(() => {});
      } else {
        browser.storage.local.remove(MODIFIER_KEY).catch(() => {});
      }
    };

    // --- Modifier key detection ---
    document.addEventListener("keydown", (e) => {
      if (e.getModifierState("Control") || e.getModifierState("Meta") || e.getModifierState("Alt")) {
        newTabIntent = true;
        saveModifierState(true);
      }
      if (e.ctrlKey || e.metaKey) {
        browser.runtime.sendMessage({ action: "setModifiers", ctrl: true });
      }
    }, true);

    document.addEventListener("keyup", (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        browser.runtime.sendMessage({ action: "setModifiers", ctrl: false });
      }
    });

    // --- Top edge exit ---
    const TOP_EDGE_THRESHOLD = 20;
    document.addEventListener("mousemove", (e: MouseEvent) => {
      if (!topEdgeExitEnabled || !isEnabled) return;
      if (e.clientY <= TOP_EDGE_THRESHOLD) exitFullscreen();
    }, true);

    // --- Strict safety ---
    const isInteractive = (target: EventTarget | null): boolean => {
      if (!strictSafety) return false;
      const el = target as HTMLElement | null;
      if (!el) return false;
      let node: HTMLElement | null = el;
      while (node && node !== document.body) {
        const tag = node.tagName;
        if (tag === "A" || tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" ||
            tag === "TEXTAREA" || tag === "LABEL" ||
            node.getAttribute("role") === "button" || node.getAttribute("role") === "link" ||
            node.isContentEditable) return true;
        node = node.parentElement;
      }
      return false;
    };

    // --- Charge ring ---
    let chargeTimer: ReturnType<typeof setTimeout> | null = null;
    let chargeStartX = 0;
    let chargeStartY = 0;
    let chargeRingEl: HTMLDivElement | null = null;
    let chargeRingAnim: number | null = null;
    const CR_SIZE = 44;
    const CR_STROKE = 3;

    const showChargeRing = (x: number, y: number, duration: number) => {
      removeChargeRing();
      if (!rippleEnabled) return;
      const el = document.createElement("div");
      const r = (CR_SIZE - CR_STROKE * 2) / 2;
      const cx = CR_SIZE / 2;
      const circ = 2 * Math.PI * r;
      el.style.cssText = `position:fixed;left:${x - CR_SIZE / 2}px;top:${y - CR_SIZE / 2}px;width:${CR_SIZE}px;height:${CR_SIZE}px;pointer-events:none;z-index:2147483647;`;
      el.innerHTML = `<svg width="${CR_SIZE}" height="${CR_SIZE}" viewBox="0 0 ${CR_SIZE} ${CR_SIZE}"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="${CR_STROKE}"/><circle class="af-ring" cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${primaryColor}" stroke-width="${CR_STROKE}" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ}" transform="rotate(-90 ${cx} ${cx})"/></svg>`;
      document.body.appendChild(el);
      chargeRingEl = el;
      const ring = el.querySelector(".af-ring") as SVGCircleElement | null;
      if (!ring) return;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        ring.style.strokeDashoffset = String(circ * (1 - (1 - (1 - p) * (1 - p))));
        el.style.opacity = String(0.4 + p * 0.5);
        if (p < 1) chargeRingAnim = requestAnimationFrame(tick);
      };
      chargeRingAnim = requestAnimationFrame(tick);
    };

    const removeChargeRing = () => {
      if (chargeRingAnim) { cancelAnimationFrame(chargeRingAnim); chargeRingAnim = null; }
      if (chargeRingEl) { chargeRingEl.remove(); chargeRingEl = null; }
    };

    const completeChargeRing = () => {
      if (chargeRingAnim) { cancelAnimationFrame(chargeRingAnim); chargeRingAnim = null; }
      if (chargeRingEl) {
        chargeRingEl.style.transition = "opacity 0.15s, transform 0.15s";
        chargeRingEl.style.opacity = "0";
        chargeRingEl.style.transform = "scale(1.3)";
        const el = chargeRingEl;
        setTimeout(() => el.remove(), 150);
        chargeRingEl = null;
      }
    };

    // --- Mousedown handler ---
    document.addEventListener("mousedown", (e: MouseEvent) => {
      const hasModifier =
        e.ctrlKey || e.metaKey || e.altKey || e.button === 1 ||
        e.getModifierState("Control") || e.getModifierState("Meta") || e.getModifierState("Alt");

      if (hasModifier) {
        newTabIntent = true;
        saveModifierState(true);
        browser.storage.local.set({ [MMB_KEY]: { url: location.href } }).catch(() => {});
        browser.runtime.sendMessage({ action: "setModifiers", ctrl: true });
        return;
      }

      if (!isEnabled || e.button !== 0 || isInteractive(e.target)) return;
      if (chargeTimer) { clearTimeout(chargeTimer); chargeTimer = null; }

      chargeStartX = e.clientX;
      chargeStartY = e.clientY;

      const doChargeAction = () => {
        if (neverAutoExit || !isFullscreen) {
          enterFullscreen();
        } else {
          exitFullscreen();
        }
      };

      if (longPressDelay === 0) {
        doChargeAction();
      } else {
        showChargeRing(e.clientX, e.clientY, longPressDelay);
        chargeTimer = setTimeout(() => {
          chargeTimer = null;
          completeChargeRing();
          doChargeAction();
        }, longPressDelay);
      }
    }, true);

    // Cancel charge on move
    document.addEventListener("mousemove", (e: MouseEvent) => {
      if (!chargeTimer) return;
      if (Math.abs(e.clientX - chargeStartX) > 50 || Math.abs(e.clientY - chargeStartY) > 50) {
        clearTimeout(chargeTimer);
        chargeTimer = null;
        removeChargeRing();
      }
    }, true);

    // Cancel charge on mouseup
    document.addEventListener("mouseup", () => {
      if (chargeTimer) {
        clearTimeout(chargeTimer);
        chargeTimer = null;
        removeChargeRing();
      }
    }, true);

    // --- SPA URL change detection ---
    let lastKnownUrl = location.href;

    const checkUrlChange = () => {
      const currentUrl = location.href;
      if (currentUrl !== lastKnownUrl) {
        lastKnownUrl = currentUrl;
        if (isEnabled && autoFullscreenEnabled && autoFullscreenOnNewVideo && !newTabIntent) {
          lastFullscreenedVideo = findMainVideo();
          lastFullscreenedUrl = lastFullscreenedVideo?.currentSrc || lastFullscreenedVideo?.src || "";
          enterFullscreen();
        }
      }
      newTabIntent = false;
      browser.storage.local.remove(MMB_KEY).catch(() => {});
    };

    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;
    history.pushState = function (...args) { origPushState.apply(this, args); checkUrlChange(); };
    history.replaceState = function (...args) { origReplaceState.apply(this, args); checkUrlChange(); };
    window.addEventListener("popstate", checkUrlChange);
    window.addEventListener("beforeunload", () => {
      browser.storage.local.remove(MMB_KEY).catch(() => {});
    });

    let urlPollInterval: ReturnType<typeof setInterval> | null = null;
    const startUrlPoll = () => {
      if (!urlPollInterval) urlPollInterval = setInterval(checkUrlChange, 1000);
    };
    const stopUrlPoll = () => {
      if (urlPollInterval) { clearInterval(urlPollInterval); urlPollInterval = null; }
    };
    document.addEventListener("visibilitychange", () => {
      document.hidden ? stopUrlPoll() : startUrlPoll();
    });
    startUrlPoll();

    // --- Async checks ---
    for (let i = 0; i < 5; i++) {
      const resp = await browser.runtime.sendMessage({ action: "getModifierState" });
      if (resp?.ctrlHeld) { newTabIntent = true; break; }
      await new Promise((r) => setTimeout(r, 100));
    }

    try {
      const modStored = await browser.storage.local.get(MODIFIER_KEY);
      const modEntry = modStored?.[MODIFIER_KEY];
      if (modEntry?.ts && (Date.now() - modEntry.ts) < MODIFIER_TTL) {
        newTabIntent = true;
      } else if (modEntry) {
        browser.storage.local.remove(MODIFIER_KEY).catch(() => {});
      }
    } catch {}

    try {
      const stored = await browser.storage.local.get(MMB_KEY);
      const entry = stored?.[MMB_KEY];
      if (entry?.url === location.href) {
        newTabIntent = true;
      } else if (entry) {
        browser.storage.local.remove(MMB_KEY).catch(() => {});
      }
    } catch {}

    // --- Auto-fullscreen on load ---
    if (isEnabled && autoFullscreenEnabled && !newTabIntent) {
      const mainVideo = findMainVideo();
      if (mainVideo) {
        lastFullscreenedVideo = mainVideo;
        lastFullscreenedUrl = mainVideo.currentSrc || mainVideo.src || "";
      }
      lastKnownUrl = location.href;
      enterFullscreen();
    }

    // --- Hide exit instructions ---
    const style = document.createElement("style");
    style.textContent = `.Chrome-Full-Screen-Exit-Instruction{display:none!important}.Full-Screen-Exit-Instruction{display:none!important}`;
    document.head.appendChild(style);

    // --- Settings watcher ---
    let settingsTimeout: ReturnType<typeof setTimeout> | null = null;
    store.watch((nv) => {
      isEnabled = nv.enabled;
      autoFullscreenEnabled = nv.autoFullscreenEnabled;
      neverAutoExit = nv.oneWayFullscreen;
      autoFullscreenOnNewVideo = nv.autoFullscreenOnNewVideo;
      strictSafety = nv.strictSafety;
      longPressDelay = nv.longPressDelay;
      topEdgeExitEnabled = nv.topEdgeExitEnabled;
      rippleEnabled = nv.rippleEnabled;
      primaryColor = nv.primaryColor || "#00FFFF";
      videoFullscreen = nv.fullscreenVideo;
      if (!isEnabled) {
        if (settingsTimeout) clearTimeout(settingsTimeout);
        settingsTimeout = setTimeout(() => exitFullscreen(), 100);
      }
    });
  },
});
