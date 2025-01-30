import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isFullscreen = false;
    let isEnabled = (await store.getValue()).enabled;
    let wasFullscreenBeforeLeaving = false;
    let isDragging = false;
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

    // Mouse handlers
    const handleMouseDown = () => {
      isDragging = true;
      if (isEnabled && !isFullscreen) {
        enterFullscreen();
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled) return;

      if (isFullscreen && e.clientY <= TOP_THRESHOLD) {
        exitFullscreen();
      } else if (!isFullscreen && (isDragging || e.buttons > 0)) {
        enterFullscreen();
      }
    };

    // Mouse enter/over handlers for non-drag activation
    const activateFullscreen = () => {
      if (!isEnabled || isFullscreen) return;
      enterFullscreen();
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
    document.addEventListener("mousedown", handleMouseDown, { passive: true });
    document.addEventListener("mouseup", handleMouseUp, { passive: true });
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseover", activateFullscreen, {
      passive: true,
    });
    document.addEventListener("mouseenter", activateFullscreen, {
      passive: true,
    });
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also track drag end outside window
    window.addEventListener("blur", handleMouseUp, { passive: true });

    // Initialize state and check if we should be fullscreen
    isFullscreen = !!document.fullscreenElement;
    if (isEnabled && !document.hidden && wasFullscreenBeforeLeaving) {
      enterFullscreen();
    }

    // Cleanup function
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseover", activateFullscreen);
      document.removeEventListener("mouseenter", activateFullscreen);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleMouseUp);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  },
});
