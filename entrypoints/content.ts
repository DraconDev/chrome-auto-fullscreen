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

    // Check if should be fullscreen based on mouse position
    const checkShouldBeFullscreen = (y: number) => {
      if (!isEnabled) return;

      if (y <= TOP_THRESHOLD) {
        if (isFullscreen) {
          exitFullscreen();
        }
      } else {
        if (!isFullscreen) {
          enterFullscreen();
        }
      }
    };

    // Handle mouse events
    const handleMouseMove = (e: MouseEvent) => {
      checkShouldBeFullscreen(e.clientY);
    };

    const handleMouseEnter = (e: MouseEvent) => {
      checkShouldBeFullscreen(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      checkShouldBeFullscreen(e.clientY);
    };

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isFullscreen) {
          exitFullscreen();
        }
      } else {
        // When returning to the page, check current mouse position
        const mouseY =
          (window as any).mouseY ?? Math.floor(window.innerHeight / 2);
        checkShouldBeFullscreen(mouseY);
      }
    };

    // Track mouse position globally
    const trackMousePosition = (e: MouseEvent) => {
      (window as any).mouseY = e.clientY;
    };

    // Watch for changes in enabled state
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      if (!isEnabled && isFullscreen) {
        exitFullscreen();
      } else if (isEnabled) {
        // Check current mouse position when enabled
        const mouseY =
          (window as any).mouseY ?? Math.floor(window.innerHeight / 2);
        checkShouldBeFullscreen(mouseY);
      }
    });

    // Set up event listeners
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseenter", handleMouseEnter, {
      passive: true,
    });
    document.addEventListener("mouseover", handleMouseOver, { passive: true });
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mousemove", trackMousePosition, {
      passive: true,
    });

    // Initial check on load
    window.requestAnimationFrame(() => {
      checkShouldBeFullscreen(Math.floor(window.innerHeight / 2));
    });

    // Initialize state
    isFullscreen = !!document.fullscreenElement;
    if (isEnabled && !document.hidden) {
      const mouseY =
        (window as any).mouseY ?? Math.floor(window.innerHeight / 2);
      checkShouldBeFullscreen(mouseY);
    }
  },
});
