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

    let lastUrl = location.href;
    const checkNavigation = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (isEnabled && autoFullscreenEnabled && reEnterFullscreenOnNavigation) {
          browser.runtime.sendMessage({ action: "setWindowFullscreen" });
        }
      }
    };

    window.addEventListener("popstate", checkNavigation);
    document.addEventListener("yt-navigate-finish", checkNavigation);

    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      checkNavigation();
    };
    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      checkNavigation();
    };

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

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;
    const MOVEMENT_THRESHOLD = 2;

    const toggleFullscreen = (x: number, y: number) => {
      completeCharge();
      browser.runtime.sendMessage({ action: "toggleWindowFullscreen" });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (longPressTimer) clearTimeout(longPressTimer);

      if (!isEnabled) return;

      const SCROLLBAR_THRESHOLD = 20;
      if (e.clientX >= window.innerWidth - SCROLLBAR_THRESHOLD) return;

      if (e.button !== 0) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;

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
        toggleFullscreen(startX, startY);
        return;
      }

      startCharge(startX, startY);

      longPressTimer = setTimeout(() => {
        toggleFullscreen(startX, startY);
        longPressTimer = null;
      }, longPressDelay);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (topEdgeExitEnabled && e.clientY <= TOP_EDGE_THRESHOLD) {
        browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
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

    const handleMouseUp = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        cancelCharge();
      }
    };

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
        browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
      }
    });

    document.addEventListener("mousedown", handleMouseDown, { passive: false });
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp, { passive: true });
    document.addEventListener("dragstart", handleMouseUp, { passive: true });
    document.addEventListener("wheel", handleMouseUp, { passive: true });
    window.addEventListener("scroll", handleMouseUp, { passive: true });
  },
});
