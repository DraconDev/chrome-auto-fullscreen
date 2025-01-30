import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    const TOP_THRESHOLD = Math.floor(window.innerHeight * 0.1); // Top 10% of screen

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

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled) return;

      if (e.clientY <= TOP_THRESHOLD) {
        // Exit fullscreen when in top 10%
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen();
        }
      } else {
        // Enter fullscreen when below top 10%
        if (
          !document.fullscreenElement &&
          document.documentElement.requestFullscreen
        ) {
          document.documentElement.requestFullscreen();
        }
      }
    };

    // Watch for changes in enabled state
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      if (!isEnabled && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    });

    // Set up event listener
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
  },
});
