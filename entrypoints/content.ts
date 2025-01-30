import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let hasUserGesture = false;

    // Add a click listener to capture user gesture
    document.addEventListener("click", () => {
      hasUserGesture = true;
      setTimeout(() => (hasUserGesture = false), 5000); // Reset after 5 seconds
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled || !hasUserGesture) return;

      const TOP_EDGE = 1;
      const TOP_ZONE = Math.floor(window.innerHeight * 0.1);

      try {
        if (e.clientY <= TOP_EDGE && document.fullscreenElement) {
          document.exitFullscreen();
        } else if (e.clientY >= TOP_ZONE && !document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        }
      } catch (error) {
        // console.log('Fullscreen change:', error.message);
      }
    };

    // Add permission check
    const hasFullscreenPermission = await chrome.permissions.contains({
      permissions: ["fullscreen"],
    });

    if (!hasFullscreenPermission) {
      console.warn("Fullscreen permission not granted");
      return;
    }

    // Style adjustments (keep your existing styles)
    const style = document.createElement("style");
    style.textContent = `/* ... your existing styles ... */`;
    document.head.appendChild(style);

    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      if (!isEnabled && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    });

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
  },
});
