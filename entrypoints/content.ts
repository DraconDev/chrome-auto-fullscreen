import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isFullscreen = false;
    let hoverTimeout: number | null = null;
    let isEnabled = (await store.getValue()).enabled;
    let wasFullscreenBeforeLeaving = false;
    const TOP_THRESHOLD = 1; // 1px threshold for faster exit

    // Function to enter fullscreen with error handling
    const enterFullscreen = async () => {
      try {
        const element = document.documentElement;
        if (element.requestFullscreen) {
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

    // Mouse move handler for top detection - no debouncing for faster response
    const handleMouseMove = (e: MouseEvent) => {
      if (isEnabled && isFullscreen && e.clientY <= TOP_THRESHOLD) {
        exitFullscreen();
      }
    };

    // Mouse hover handler with minimal delay
    const handleMouseHover = () => {
      if (!isEnabled || isFullscreen) return;

      // Clear any existing timeout
      if (hoverTimeout !== null) {
        clearTimeout(hoverTimeout);
      }

      // Minimal delay to prevent accidental triggers
      hoverTimeout = window.setTimeout(() => {
        enterFullscreen();
      }, 100); // Reduced to 100ms for snappier response
    };

    // Mouse leave handler
    const handleMouseLeave = () => {
      if (hoverTimeout !== null) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
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
    document.body.addEventListener("mouseenter", handleMouseHover);
    document.body.addEventListener("mouseleave", handleMouseLeave);
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
      document.body.removeEventListener("mouseenter", handleMouseHover);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (hoverTimeout !== null) {
        clearTimeout(hoverTimeout);
      }
    };
  },
});
