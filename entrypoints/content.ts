import { defineContentScript } from "wxt/sandbox";
import { store } from "@/utils/store";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    const TOP_EDGE = 1; // 1px threshold for exit
    const TOP_ZONE = Math.floor(window.innerHeight * 0.1); // Top 10% for re-entry

    // Hide fullscreen message
    // const style = document.createElement("style");
    // style.textContent = `
    //   *:fullscreen::backdrop {
    //     background-color: transparent;
    //   }
    //   /* Chrome */
    //   .Chrome-Full-Screen-Exit-Instruction {
    //     display: none !important;
    //   }
    //   /* Firefox */
    //   .Full-Screen-Exit-Instruction {
    //     display: none !important;
    //   }
    //   /* General fullscreen message hiding attempt */
    //   div[class*="fullscreen-exit"],
    //   div[class*="fullscreen-notification"],
    //   div[class*="exit-fullscreen"],
    //   div[id*="fullscreen-exit"],
    //   div[id*="fullscreen-notification"] {
    //     display: none !important;
    //   }
    // `;
    // document.head.appendChild(style);

    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      if (!isEnabled) return;

      if (e.clientY <= TOP_EDGE) {
        // Exit fullscreen when at very top
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      } else if (e.clientY >= TOP_ZONE) {
        // Enter fullscreen when in top 10% (but not at very top)
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        }
      }
    };

    // Watch for changes in enabled state
    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      if (!isEnabled && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    });

    // Set up event listener
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
  },
});
