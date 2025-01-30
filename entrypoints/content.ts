import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    const TOP_EDGE = 1; // 1px threshold for exit

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

    // Handle mouse movement (only for exit)
    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled) return;

      // Exit at top edge
      if (e.clientY <= TOP_EDGE) {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    };

    // Handle click for entering fullscreen
    const handleClick = () => {
      if (!isEnabled) return;

      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        document.documentElement.requestFullscreen();
      }
    };

    // Watch for changes in enabled state
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      if (!isEnabled && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    });

    // Set up event listeners
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("click", handleClick, { passive: true });
  },
});
