import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let interceptFirstClick = (await store.getValue()).interceptFirstClick;
    const TOP_EDGE = 1; // 1px threshold for exit
    let isFirstClickAfterFullscreen = false;

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

    // Track fullscreen changes to reset first click state
    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement) {
        // Just entered fullscreen - set flag to intercept first click if needed
        isFirstClickAfterFullscreen = true;
      } else {
        // Exited fullscreen - reset flag
        isFirstClickAfterFullscreen = false;
      }
    });

    // Handle click for entering fullscreen or intercepting first click
    const handleClick = (e: MouseEvent) => {
      if (!isEnabled) return;

      // If we're not in fullscreen, enter fullscreen
      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        document.documentElement.requestFullscreen();
        return;
      }

      // If we are in fullscreen and this is the first click after entering fullscreen
      // and the interceptFirstClick option is enabled, then block this click
      if (
        document.fullscreenElement &&
        isFirstClickAfterFullscreen &&
        interceptFirstClick
      ) {
        console.log("Intercepting first click after entering fullscreen");
        e.stopPropagation();
        e.preventDefault();
        
        // Reset the flag so subsequent clicks work normally
        isFirstClickAfterFullscreen = false;
      }
    };

    // Watch for changes in settings
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      interceptFirstClick = newValue.interceptFirstClick;

      if (!isEnabled && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    });

    // Set up event listeners
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("click", handleClick, { passive: false });
  },
});
