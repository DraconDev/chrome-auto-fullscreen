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
        console.log("Attempting to enter fullscreen...");
        const element = document.documentElement;
        if (!isFullscreen && element.requestFullscreen) {
          await element.requestFullscreen();
          isFullscreen = true;
          wasFullscreenBeforeLeaving = true;
          console.log("Entered fullscreen successfully");
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
      console.log("Fullscreen state changed:", isFullscreen);
      if (!isFullscreen) {
        wasFullscreenBeforeLeaving = false;
      }
    };

    // Handle all mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled) return;
      console.log("Mouse move detected, Y:", e.clientY);

      // Always exit when at top
      if (e.clientY <= TOP_THRESHOLD) {
        if (isFullscreen) {
          exitFullscreen();
        }
        return;
      }

      // Otherwise, always try to enter fullscreen
      if (!isFullscreen) {
        enterFullscreen();
      }
    };

    // Handle mouse enter (for re-entering the window)
    const handleMouseEnter = (e: MouseEvent) => {
      if (!isEnabled) return;
      console.log("Mouse entered window");

      // If entering not at the top, go fullscreen
      if (e.clientY > TOP_THRESHOLD) {
        enterFullscreen();
      }
    };

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      console.log("Visibility changed:", !document.hidden);
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
      console.log("Enabled state changed:", isEnabled);
      if (!isEnabled && isFullscreen) {
        exitFullscreen();
      }
    });

    // Set up persistent event listeners
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseenter", handleMouseEnter, {
      passive: true,
    });
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Try to enter fullscreen immediately if mouse is in the window
    window.requestAnimationFrame(() => {
      const mouseEvent = new MouseEvent("mousemove", {
        clientY: Math.floor(window.innerHeight / 2), // Middle of the window
      });
      handleMouseMove(mouseEvent);
    });

    // Initialize state
    isFullscreen = !!document.fullscreenElement;
    if (isEnabled && !document.hidden && wasFullscreenBeforeLeaving) {
      enterFullscreen();
    }
  },
});
