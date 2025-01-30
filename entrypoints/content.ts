import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let hasUserGesture = false;
    let isFullscreen = document.fullscreenElement !== null;

    // 1. One-time click handler to enable future controls
    const enableControl = () => {
      hasUserGesture = true;
      document.removeEventListener("click", enableControl);

      // Add visual feedback if needed
      console.log("Fullscreen controls activated!");
    };

    // 2. Initial click capture (transparent overlay technique)
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: "999999",
      pointerEvents: "none",
    });
    document.body.appendChild(overlay);
    overlay.addEventListener("click", enableControl, { once: true });

    // 3. Mouse movement logic
    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled || !hasUserGesture) return;

      const TOP_EDGE = 1;
      const TOP_ZONE = window.innerHeight * 0.05;

      try {
        if (e.clientY <= TOP_EDGE && isFullscreen) {
          document.exitFullscreen();
        } else if (e.clientY > TOP_ZONE && !isFullscreen) {
          document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.log("Fullscreen control:", error);
      }
    };

    // 4. Fullscreen state tracking
    document.addEventListener("fullscreenchange", () => {
      isFullscreen = document.fullscreenElement !== null;
    });

    document.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 5. Cleanup and styles
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      if (!isEnabled && isFullscreen) {
        document.exitFullscreen();
      }
    });

    const style = document.createElement("style");
    style.textContent = `
      *:fullscreen::backdrop { background-color: transparent; }
      .Chrome-Full-Screen-Exit-Instruction { display: none !important; }
    `;
    document.head.appendChild(style);
  },
});
