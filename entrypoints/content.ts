import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;

    // Uncomment to hide fullscreen exit messages
    const style = document.createElement("style");
    style.textContent = `
      *:fullscreen::backdrop {
        background-color: transparent;
      }
      .Chrome-Full-Screen-Exit-Instruction {
        display: none !important;
      }
      .Full-Screen-Exit-Instruction {
        display: none !important;
      }
      div[class*="fullscreen-exit"],
      div[class*="fullscreen-notification"],
      div[class*="exit-fullscreen"],
      div[id*="fullscreen-exit"],
      div[id*="fullscreen-notification"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled) return;

      const TOP_EDGE = 1;
      const TOP_ZONE = Math.floor(window.innerHeight * 0.1); // Top 10%

      // Exit fullscreen when at very top
      if (e.clientY <= TOP_EDGE && document.fullscreenElement) {
        document.exitFullscreen();
      }
      // Enter fullscreen when below top 10%
      else if (e.clientY >= TOP_ZONE && !document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      }
    };

    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      if (!isEnabled && document.fullscreenElement) {
        document.exitFullscreen();
      }
    });

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
  },
});
