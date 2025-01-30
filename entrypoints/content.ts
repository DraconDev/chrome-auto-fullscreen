import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isFullscreen = false;
    let isEnabled = (await store.getValue()).enabled;
    let wasFullscreenBeforeLeaving = false;
    const TOP_THRESHOLD = 1; // 1px threshold for faster exit

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

    // Function to enter fullscreen with error handling
    const enterFullscreen = async () => {
      try {
        const element = document.documentElement;
        if (!isFullscreen && element.requestFullscreen) {
          await element.requestFullscreen();
          isFullscreen = true;
          wasFullscreenBeforeLeaving = true;
        }
      } catch (error) {
        console.error("Failed to enter fullscreen:", error);
      }
    };

    // Function to exit fullscreen with error handling
    const exitFullscreen = async () => {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
          isFullscreen = false;
          wasFullscreenBeforeLeaving = false;
        }
      } catch (error) {
        console.error("Failed to exit fullscreen:", error);
      }
    };

    // Track fullscreen state changes
    const handleFullscreenChange = () => {
      isFullscreen = !!document.fullscreenElement;
      if (!isFullscreen) {
        wasFullscreenBeforeLeaving = false;
      }
    };

    // Mouse move handler for both exit and enter
    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled) return;

      if (isFullscreen && e.clientY <= TOP_THRESHOLD) {
        exitFullscreen();
      } else if (!isFullscreen && e.clientY > TOP_THRESHOLD) {
        enterFullscreen();
      }
    };

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isFullscreen) {
          exitFullscreen();
        }
      } else {
        // When returning to the page, if it was fullscreen before, re-enter immediately
        if (wasFullscreenBeforeLeaving && isEnabled) {
          enterFullscreen();
        }
      }
    };

    // Watch for changes in enabled state
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      if (!isEnabled && isFullscreen) {
        exitFullscreen();
      }
    });

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initialize state and check if we should be fullscreen
    isFullscreen = !!document.fullscreenElement;
    if (isEnabled && !document.hidden && wasFullscreenBeforeLeaving) {
      enterFullscreen();
    }

    // Cleanup function
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  },
});
