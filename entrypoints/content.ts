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
    // const TOP_EDGE = 1; // Removed

    // CSS Variables for dynamic updates
    const updateStyles = () => {
      document.documentElement.style.setProperty("--af-color", primaryColor);
      document.documentElement.style.setProperty(
        "--af-delay",
        `${longPressDelay}ms`
      );
    };
    updateStyles();

    // Hide fullscreen message
    const style = document.createElement("style");
    style.textContent = `
      *:fullscreen::backdrop {
        background-color: transparent;
      }
      /* Chrome */
      .Chrome-Full-Screen-Exit-Instruction {
        display: none !important;
      }
      /* Firefox */
      .Full-Screen-Exit-Instruction {
        display: none !important;
      }
      /* Charge Ring Effect */
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
      /* General fullscreen message hiding attempt */
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
      if (!rippleEnabled) return;
      if (activeChargeRing) activeChargeRing.remove();

      const ring = document.createElement("div");
      ring.className = "af-charge-ring";
      ring.style.left = `${x}px`;
      ring.style.top = `${y}px`;
      document.body.appendChild(ring);

      // Force Reflow
      ring.getBoundingClientRect();

      // Start Animation
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

    // Long Press Logic
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;
    // const PRESS_DELAY = 200; // Legacy hardcoded
    const MOVEMENT_THRESHOLD = 2; // Strict 2px tolerance (effectively same pixel)

    const toggleFullscreen = (x: number, y: number) => {
      // Toggle Logic
      completeCharge(); // Visual Success

      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        document.documentElement.requestFullscreen();
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // 1. Reset
      if (longPressTimer) clearTimeout(longPressTimer);

      // 2. Ignore if disabled
      if (!isEnabled) return;

      // 3. Ignore non-primary button (only left click)
      if (e.button !== 0) return;

      // 4. Heuristics (Safe Check)
      // Ignore if text is selected (Hard Rule: Always respect active selection)
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;

      if (strictSafety) {
        const target = e.target as Element;
        if (target) {
          const style = window.getComputedStyle(target);
          // Strict: Block pointer/move/help/wait.
          if (["pointer", "move", "help", "wait"].includes(style.cursor))
            return;
          // Strict: Block interactive tags
          if (
            target.closest(
              "a, button, input, textarea, select, label, audio, video"
            )
          )
            return;
        }
      }

      // 5. Start Timer & Visuals
      startX = e.clientX;
      startY = e.clientY;

      startCharge(startX, startY);

      longPressTimer = setTimeout(() => {
        toggleFullscreen(startX, startY);
        longPressTimer = null; // Reset after firing
      }, longPressDelay);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!longPressTimer) return;

      // Cancel if moved beyond strict threshold
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist > MOVEMENT_THRESHOLD) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        cancelCharge(); // Visual Cancel
      }
    };

    const handleMouseUp = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        cancelCharge(); // Visual Cancel
      }
    };

    // Watch for changes in settings
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      rippleEnabled = newValue.rippleEnabled;
      strictSafety = newValue.strictSafety;
      longPressDelay = newValue.longPressDelay;
      primaryColor = newValue.primaryColor;
      updateStyles();
      if (!isEnabled && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    });

    // Set up event listeners
    document.addEventListener("mousedown", handleMouseDown, { passive: true });
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp, { passive: true });
    document.addEventListener("dragstart", handleMouseUp, { passive: true }); // Cancel on drag start too
  },
});
