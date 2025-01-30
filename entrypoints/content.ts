import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let isFullscreen = document.fullscreenElement !== null;

    // Track fullscreen state changes
    document.addEventListener("fullscreenchange", () => {
      isFullscreen = document.fullscreenElement !== null;
    });

    const handleMouseMove = async (e: MouseEvent) => {
      if (!isEnabled) return;

      const TOP_EDGE = 1;
      const TOP_ZONE = Math.floor(window.innerHeight * 0.05); // 5%

      try {
        // Exit condition: Only at absolute top edge
        if (e.clientY <= TOP_EDGE && isFullscreen) {
          await document.exitFullscreen();
        }
        // Enter condition: Anywhere below 5% when not fullscreen
        else if (e.clientY > TOP_ZONE && !isFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.log("Fullscreen change:", error);
      }
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Store watcher and styles remain the same
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      if (!isEnabled && isFullscreen) {
        document.exitFullscreen();
      }
    });

    // Uncomment to hide fullscreen exit messages
    // const style = document.createElement("style");
    // style.textContent = `
    //       *:fullscreen::backdrop {
    //         background-color: transparent;
    //       }
    //       .Chrome-Full-Screen-Exit-Instruction {
    //         display: none !important;
    //       }
    //       .Full-Screen-Exit-Instruction {
    //         display: none !important;
    //       }
    //       div[class*="fullscreen-exit"],
    //       div[class*="fullscreen-notification"],
    //       div[class*="exit-fullscreen"],
    //       div[id*="fullscreen-exit"],
    //       div[id*="fullscreen-notification"] {
    //         display: none !important;
    //       }
    //     `;
    // document.head.appendChild(style);
  },
});
