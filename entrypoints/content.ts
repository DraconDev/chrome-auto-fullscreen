import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isFullscreen = false;
    let isEnabled = (await store.getValue()).enabled;
    let lastAttempt = 0;
    const TOP_THRESHOLD = 1; // 1px threshold for faster exit
    const RETRY_DELAY = 100; // Minimum ms between fullscreen attempts

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
      const now = Date.now();
      if (now - lastAttempt < RETRY_DELAY) return;
      lastAttempt = now;

      try {
        const element = document.documentElement;
        if (!isFullscreen && element.requestFullscreen) {
          await element.requestFullscreen();
          isFullscreen = true;
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
        }
      } catch (error) {
        console.error("Failed to exit fullscreen:", error);
      }
    };

    // Track fullscreen state changes
    const handleFullscreenChange = () => {
      isFullscreen = !!document.fullscreenElement;
    };

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled) return;

      if (e.clientY <= TOP_THRESHOLD) {
        if (isFullscreen) {
          exitFullscreen();
        }
      } else if (!isFullscreen) {
        enterFullscreen();
      }
    };

    // Watch for changes in enabled state
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      if (!isEnabled && isFullscreen) {
        exitFullscreen();
      }
    });

    // Set up event listeners
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Initialize state
    isFullscreen = !!document.fullscreenElement;
  },
});
