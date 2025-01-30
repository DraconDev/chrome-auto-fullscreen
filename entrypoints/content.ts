import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isFullscreen = false;
    let isEnabled = (await store.getValue()).enabled;
    let wasFullscreenBeforeLeaving = false;
    let lastAttempt = 0;
    const TOP_THRESHOLD = 1; // 1px threshold for faster exit
    const ATTEMPT_THRESHOLD = 50; // ms between attempts

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
        const now = Date.now();
        if (now - lastAttempt < ATTEMPT_THRESHOLD) return;
        lastAttempt = now;

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

    // Mouse move handler for exit
    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled) return;

      if (isFullscreen && e.clientY <= TOP_THRESHOLD) {
        exitFullscreen();
      } else if (!isFullscreen) {
        requestAnimationFrame(() => {
          enterFullscreen();
        });
      }
    };

    // Additional mouse handlers for better activation
    const handleMouseOver = () => {
      if (!isEnabled || isFullscreen) return;
      requestAnimationFrame(() => {
        enterFullscreen();
      });
    };

    const handleMouseEnter = () => {
      if (!isEnabled || isFullscreen) return;
      requestAnimationFrame(() => {
        enterFullscreen();
      });
    };

    const handleClick = () => {
      if (!isEnabled || isFullscreen) return;
      requestAnimationFrame(() => {
        enterFullscreen();
      });
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
    document.addEventListener("mouseover", handleMouseOver, { passive: true });
    document.addEventListener("mouseenter", handleMouseEnter, {
      passive: true,
    });
    document.addEventListener("click", handleClick, { passive: true });
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
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  },
});
