import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let rippleEnabled = (await store.getValue()).rippleEnabled;
    let strictSafety = (await store.getValue()).strictSafety;
    let longPressDelay = (await store.getValue()).longPressDelay;
    let primaryColor = (await store.getValue()).primaryColor;
    let topEdgeExitEnabled = (await store.getValue()).topEdgeExitEnabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;
    let reEnterFullscreenOnNavigation = (await store.getValue()).reEnterFullscreenOnNavigation;
    const TOP_EDGE_THRESHOLD = 1;

    if (isEnabled && autoFullscreenEnabled) {
      browser.runtime.sendMessage({ action: "setWindowFullscreen" });
    }

    // --- Navigation detection ---

    let lastPathname = location.pathname;

    // Store the last mousedown event so pushState/replaceState patches
    // can check if the user is holding modifier keys.
    let lastMouseDown: MouseEvent | null = null;

    const onNavigate = () => {
      if (isEnabled && autoFullscreenEnabled && reEnterFullscreenOnNavigation) {
        browser.runtime.sendMessage({ action: "setWindowFullscreen" });
      }
    };

    const isModifiedClick = (): boolean => {
      if (!lastMouseDown) return false;
      return !!(
        lastMouseDown.ctrlKey ||
        lastMouseDown.metaKey ||
        lastMouseDown.shiftKey ||
        lastMouseDown.altKey
      );
    };

    // Patch pushState/replaceState — check lastMouseDown for modifiers.
    // YouTube calls pushState from its click handler, which runs AFTER
    // mousedown. So lastMouseDown will have the modifier state.
    const patchHistoryMethod = (method: "pushState" | "replaceState") => {
      const original = history[method];
      history[method] = function (...args: Parameters<typeof original>) {
        original.apply(this, args);
        if (isModifiedClick()) return;
        if (location.pathname !== lastPathname) {
          lastPathname = location.pathname;
          onNavigate();
        }
      };
    };
    patchHistoryMethod("pushState");
    patchHistoryMethod("replaceState");

    // Standard browser events — these only fire on real navigations
    window.addEventListener("popstate", () => {
      if (location.pathname !== lastPathname) {
        lastPathname = location.pathname;
        onNavigate();
      }
    });

    // YouTube-specific navigation events
    const ytNavHandler = () => {
      if (isModifiedClick()) return;
      if (location.pathname !== lastPathname) {
        lastPathname = location.pathname;
        onNavigate();
      }
    };
    document.addEventListener("yt-navigate-finish", ytNavHandler);
    document.addEventListener("yt-page-data-updated", ytNavHandler);

    // --- Styles ---

    const updateStyles = () => {
      document.documentElement.style.setProperty("--af-color", primaryColor);
      document.documentElement.style.setProperty(
        "--af-delay",
        `${longPressDelay}ms`,
      );
    };
    updateStyles();

    const style = document.createElement("style");
    style.textContent = `
      *:fullscreen::backdrop {
        background-color: transparent;
      }
      .Chrome-Full-Screen-Exit-Instruction {
        display: none !important;
      }
      .Full-Screen-Exit-Instruction {
        display: none !important;
      }
      .af-charge-ring {
        position: fixed;
        border-radius: 50%;
        background: transparent;
        border: 2px solid var(--af-color, cyan);
        box-shadow: 0 0 4px var(--af-color, cyan);
        transform: scale(0);
        pointer-events: none;
        z-index: 2147483647;
        width: 40px;
        height: 40px;
        margin-left: -20px;
        margin-top: -20px;
        opacity: 0;
        transition: transform var(--af-delay, 200ms) linear, opacity var(--af-delay, 200ms) linear;
      }
      .af-charge-ring.charging {
        transform: scale(1);
        opacity: 1;
      }
      .af-charge-ring.success {
        transform: scale(1.5);
        opacity: 0;
        transition: transform 0.1s ease-out, opacity 0.1s ease-out;
        border-color: white;
      }
      div[class*="fullscreen-exit"],
      div[class*="fullscreen-notification"],
      div[class*="exit-fullscreen"],
      div[id*="fullscreen-exit"],
      div[id*="fullscreen-notification"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // --- Charge ring ---

    let activeChargeRing: HTMLDivElement | null = null;

    const startCharge = (x: number, y: number) => {
      if (!rippleEnabled || longPressDelay === 0) return;
      if (activeChargeRing) activeChargeRing.remove();

      const ring = document.createElement("div");
      ring.className = "af-charge-ring";
      ring.style.left = `${x}px`;
      ring.style.top = `${y}px`;
      document.body.appendChild(ring);
      ring.getBoundingClientRect();
      ring.classList.add("charging");
      activeChargeRing = ring;
    };

    const cancelCharge = () => {
      if (activeChargeRing) {
        activeChargeRing.remove();
        activeChargeRing = null;
      }
    };

    const completeCharge = () => {
      if (activeChargeRing) {
        const ring = activeChargeRing;
        ring.classList.add("success");
        ring.classList.remove("charging");
        setTimeout(() => ring.remove(), 200);
        activeChargeRing = null;
      }
    };

    // --- Fullscreen helpers ---

    const findMainVideo = (): HTMLVideoElement | null => {
      // Find the largest visible video on the page (the main player)
      const videos = document.querySelectorAll("video");
      let best: HTMLVideoElement | null = null;
      let bestArea = 0;
      for (const v of videos) {
        const area = v.offsetWidth * v.offsetHeight;
        if (area > bestArea) {
          best = v;
          bestArea = area;
        }
      }
      // Also search inside shadow DOMs (YouTube uses custom elements)
      if (!best || bestArea < 10000) {
        const allElements = document.querySelectorAll("*");
        for (const el of allElements) {
          if (el.shadowRoot) {
            const shadowVideos = el.shadowRoot.querySelectorAll("video");
            for (const v of shadowVideos) {
              const area = v.offsetWidth * v.offsetHeight;
              if (area > bestArea) {
                best = v;
                bestArea = area;
              }
            }
          }
        }
      }
      return best;
    };

    const enterFullscreen = () => {
      const video = findMainVideo();
      if (video && document.fullscreenEnabled) {
        video.requestFullscreen().catch(() => {
          browser.runtime.sendMessage({ action: "toggleWindowFullscreen" });
        });
      } else {
        browser.runtime.sendMessage({ action: "toggleWindowFullscreen" });
      }
    };

    const exitFullscreen = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
        });
      } else {
        browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
      }
    };

    // --- Long press / fullscreen toggle ---

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;
    const MOVEMENT_THRESHOLD = 2;

    const handleMouseDown = (e: MouseEvent) => {
      // Always record the last mousedown for navigation detection
      lastMouseDown = e;

      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      if (!isEnabled) return;

      const SCROLLBAR_THRESHOLD = 20;
      if (e.clientX >= window.innerWidth - SCROLLBAR_THRESHOLD) return;

      if (e.button !== 0) return;

      // Block when modifier keys are held
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;

      const target = e.target as Element;

      if (strictSafety) {
        if (target) {
          const style = window.getComputedStyle(target);
          if (["pointer", "move", "help", "wait"].includes(style.cursor))
            return;
          if (
            target.closest(
              "a, button, input, textarea, select, label, [role='button'], [role='link'], [role='checkbox'], [role='menuitem'], [role='option'], [role='tab'], [role='slider'], [role='scrollbar'], [role='listbox']",
            )
          )
            return;
        }
      }

      startX = e.clientX;
      startY = e.clientY;

      if (longPressDelay === 0) {
        completeCharge();
        enterFullscreen();
        return;
      }

      startCharge(startX, startY);

      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        enterFullscreen();
        completeCharge();
      }, longPressDelay);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (topEdgeExitEnabled && e.clientY <= TOP_EDGE_THRESHOLD) {
        exitFullscreen();
        return;
      }

      if (!longPressTimer) return;

      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist > MOVEMENT_THRESHOLD) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        cancelCharge();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (longPressTimer && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        cancelCharge();
        return;
      }
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        cancelCharge();
      }
    };

    // --- Settings watcher ---

    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      rippleEnabled = newValue.rippleEnabled;
      strictSafety = newValue.strictSafety;
      longPressDelay = newValue.longPressDelay;
      primaryColor = newValue.primaryColor;
      topEdgeExitEnabled = newValue.topEdgeExitEnabled;
      autoFullscreenEnabled = newValue.autoFullscreenEnabled;
      reEnterFullscreenOnNavigation = newValue.reEnterFullscreenOnNavigation;
      updateStyles();
      if (!isEnabled) {
        exitFullscreen();
      }
    });

    // --- Event listeners ---

    document.addEventListener("mousedown", handleMouseDown, { passive: false });
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp, { passive: true });
    document.addEventListener("dragstart", handleMouseUp, { passive: true });
    document.addEventListener("wheel", handleMouseUp, { passive: true });
    window.addEventListener("scroll", handleMouseUp, { passive: true });
  },
});
