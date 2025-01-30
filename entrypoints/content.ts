import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    let isFullscreen = false;
    let hoverTimeout: number | null = null;
    const TOP_THRESHOLD = 50; // pixels from top to trigger exit

    // Function to enter fullscreen
    const enterFullscreen = () => {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
        isFullscreen = true;
      }
    };

    // Function to exit fullscreen
    const exitFullscreen = () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
        isFullscreen = false;
      }
    };

    // Mouse move handler for top detection
    const handleMouseMove = (e: MouseEvent) => {
      if (isFullscreen && e.clientY <= TOP_THRESHOLD) {
        exitFullscreen();
      }
    };

    // Mouse hover handler
    const handleMouseHover = () => {
      if (!isFullscreen) {
        // Clear any existing timeout
        if (hoverTimeout !== null) {
          clearTimeout(hoverTimeout);
        }

        // Set a small delay before entering fullscreen to prevent accidental triggers
        hoverTimeout = window.setTimeout(() => {
          enterFullscreen();
        }, 500);
      }
    };

    // Mouse leave handler
    const handleMouseLeave = () => {
      if (hoverTimeout !== null) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
    };

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseenter", handleMouseHover);
    document.body.addEventListener("mouseleave", handleMouseLeave);

    // Cleanup function
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseenter", handleMouseHover);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
      if (hoverTimeout !== null) {
        clearTimeout(hoverTimeout);
      }
    };
  },
});
