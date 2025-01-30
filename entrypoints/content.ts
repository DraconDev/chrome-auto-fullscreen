import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isFullscreen = false;
    let hoverTimeout: number | null = null;
    let isEnabled = (await store.getValue()).enabled;
    const TOP_THRESHOLD = 1; // pixels from top to trigger exit

    // Function to enter fullscreen with error handling
    const enterFullscreen = async () => {
      try {
        const element = document.documentElement;
        if (element.requestFullscreen) {
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

    // Mouse move handler for top detection with debouncing
    let moveTimeout: number | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled || !isFullscreen) return;

      if (moveTimeout !== null) {
        window.clearTimeout(moveTimeout);
      }

      moveTimeout = window.setTimeout(() => {
        if (e.clientY <= TOP_THRESHOLD) {
          exitFullscreen();
        }
      }, 30); // Small delay to prevent flickering
    };

    // Mouse hover handler with improved timing
    const handleMouseHover = () => {
      if (!isEnabled || isFullscreen) return;

      // Clear any existing timeout
      if (hoverTimeout !== null) {
        clearTimeout(hoverTimeout);
      }

      // Set a small delay before entering fullscreen to prevent accidental triggers
      hoverTimeout = window.setTimeout(() => {
        enterFullscreen();
      }, 750); // Slightly longer delay for more intentional activation
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
      if (document.hidden && isFullscreen) {
        exitFullscreen();
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

    // Reinitialize fullscreen state
    isFullscreen = !!document.fullscreenElement;

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
      if (moveTimeout !== null) {
        clearTimeout(moveTimeout);
      }
    };
  },
});
