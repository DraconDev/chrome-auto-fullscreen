import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let activationY: null | number = null;

    // 1. Capture initial mouse down as user gesture
    document.addEventListener("mousedown", (e) => {
      activationY = e.clientY;
    });

    // 2. Use mouse move after initial gesture
    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled || activationY === null) return;

      const TOP_EDGE = 1;
      const TOP_ZONE = Math.floor(window.innerHeight * 0.1);

      try {
        // Vertical movement check (at least 100px from activation point)
        if (Math.abs(e.clientY - activationY) > 100) {
          // Exit fullscreen at top edge
          if (e.clientY <= TOP_EDGE && document.fullscreenElement) {
            document.exitFullscreen();
            activationY = null;
          }
          // Enter fullscreen in lower 90%
          else if (e.clientY >= TOP_ZONE && !document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            activationY = null;
          }
        }
      } catch (error) {
        // console.log("Fullscreen change:", error.message);
      }
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 3. Reset activation after 5 seconds
    setInterval(() => {
      activationY = null;
    }, 5000);

    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      if (!isEnabled && document.fullscreenElement) {
        document.exitFullscreen();
      }
    });

    // Uncomment to hide fullscreen exit messages
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
          div[class*="fullscreen-exit"],
          div[class*="fullscreen-notification"],
          div[class*="exit-fullscreen"],
          div[id*="fullscreen-exit"],
          div[id*="fullscreen-notification"] {
            display: none !important;
          }
        `;
    document.head.appendChild(style);
  },
});
