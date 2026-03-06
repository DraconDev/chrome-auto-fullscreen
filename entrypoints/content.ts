import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

const PENDING_FULLSCREEN_KEY = "af-pending-fullscreen";

export default defineContentScript({
 matches: ["<all_urls>"],
 async main() {
 let isEnabled = (await store.getValue()).enabled;
 let rippleEnabled = (await store.getValue()).rippleEnabled;
 let strictSafety = (await store.getValue()).strictSafety;
 let longPressDelay = (await store.getValue()).longPressDelay;
 let primaryColor = (await store.getValue()).primaryColor;
 let topEdgeExitEnabled = (await store.getValue()).topEdgeExitEnabled;
 let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;
 let videoClickFullscreen = (await store.getValue()).videoClickFullscreen;
 let videoKeyFullscreen = (await store.getValue()).videoKeyFullscreen;
 const TOP_EDGE_THRESHOLD = 1;

 const isVideoWatchPage = () => {
 const path = window.location.pathname;
 return path.includes("/watch") || path.includes("/shorts/");
 };

 const pendingFullscreen = sessionStorage.getItem(PENDING_FULLSCREEN_KEY);
 if (pendingFullscreen === "true" && isVideoWatchPage()) {
 sessionStorage.removeItem(PENDING_FULLSCREEN_KEY);
 const checkAndFullscreen = () => {
 const video = document.querySelector("video");
 if (video && video.readyState >= 2) {
 browser.runtime.sendMessage({ action: "setWindowFullscreen" });
 return true;
 }
 return false;
 };
 if (!checkAndFullscreen()) {
 const observer = new MutationObserver(() => {
 if (checkAndFullscreen()) {
 observer.disconnect();
 }
 });
 observer.observe(document.body, { childList: true, subtree: true });
 setTimeout(() => observer.disconnect(), 5000);
 }
 } else if (isEnabled && autoFullscreenEnabled) {
 browser.runtime.sendMessage({ action: "setWindowFullscreen" });
 }

    const updateStyles = () => {
      document.documentElement.style.setProperty("--af-color", primaryColor);
      document.documentElement.style.setProperty(
        "--af-delay",
        `${longPressDelay}ms`,
      );
    };
    updateStyles();

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
      .af-charge-ring {
        position: fixed;
        border-radius: 50%;
        background: transparent;
        border: 2px solid var(--af-color, cyan);
        box-shadow: 0 0 4px var(--af-color, cyan);
        transform: scale(0);
        pointer-events: none;
        z-index: 2147483647;
        width: 40px;
        height: 40px;
        margin-left: -20px;
        margin-top: -20px;
        opacity: 0;
        transition: transform var(--af-delay, 200ms) linear, opacity var(--af-delay, 200ms) linear;
      }
      .af-charge-ring.charging {
        transform: scale(1);
        opacity: 1;
      }
      .af-charge-ring.success {
        transform: scale(1.5);
        opacity: 0;
        transition: transform 0.1s ease-out, opacity 0.1s ease-out;
        border-color: white;
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

    let activeChargeRing: HTMLDivElement | null = null;

    const startCharge = (x: number, y: number) => {
      if (!rippleEnabled || longPressDelay === 0) return;
      if (activeChargeRing) activeChargeRing.remove();

      const ring = document.createElement("div");
      ring.className = "af-charge-ring";
      ring.style.left = `${x}px`;
      ring.style.top = `${y}px`;
      document.body.appendChild(ring);
      ring.getBoundingClientRect();
      ring.classList.add("charging");
      activeChargeRing = ring;
    };

    const cancelCharge = () => {
      if (activeChargeRing) {
        activeChargeRing.remove();
        activeChargeRing = null;
      }
    };

    const completeCharge = () => {
      if (activeChargeRing) {
        const ring = activeChargeRing;
        ring.classList.add("success");
        ring.classList.remove("charging");
        setTimeout(() => ring.remove(), 200);
        activeChargeRing = null;
      }
    };

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;
    const MOVEMENT_THRESHOLD = 2;

    const toggleFullscreen = (x: number, y: number) => {
      completeCharge();
      browser.runtime.sendMessage({ action: "toggleWindowFullscreen" });
    };

    const isVideoUrl = (url: string): boolean => {
      const videoPatterns = [
        /youtube\.com\/watch/i,
        /youtube\.com\/shorts/i,
        /youtu\.be\//i,
        /odysee\.com\/@/i,
        /odysee\.com\/\$\/video/i,
      ];
      return videoPatterns.some(pattern => pattern.test(url));
    };

    const enterVideoFullscreen = (video: HTMLVideoElement) => {
      // Only enter fullscreen, don't toggle if already fullscreen
      if (document.fullscreenElement) {
        console.log("[Fullscreen] Already in fullscreen, skipping");
        return;
      }

      const isYouTube = window.location.hostname.includes("youtube.com");
      const isOdysee = window.location.hostname.includes("odysee.com");

      console.log("[Fullscreen] Entering fullscreen for video");

      if (isYouTube) {
        const player = video.closest(".html5-video-player") as HTMLElement;
        if (player) {
          // Check if already in fullscreen mode via YouTube's class
          if (player.classList.contains("ytp-fullscreen")) return;
          const fsButton = player.querySelector(".ytp-fullscreen-button") as HTMLButtonElement;
          if (fsButton) {
            fsButton.click();
            return;
          }
        }
      }

      if (isOdysee) {
        const player = video.closest(".video-js") as HTMLElement;
        if (player) {
          // Check if already in fullscreen mode via Video.js class
          if (player.classList.contains("vjs-fullscreen")) return;
          const fsButton = player.querySelector(".vjs-fullscreen-control") as HTMLButtonElement;
          if (fsButton) {
            fsButton.click();
            return;
          }
        }
      }

      video.requestFullscreen().catch(() => {});
    };

    const toggleVideoFullscreen = (video: HTMLVideoElement) => {
      const isYouTube = window.location.hostname.includes("youtube.com");
      const isOdysee = window.location.hostname.includes("odysee.com");

      if (isYouTube) {
        const player = video.closest(".html5-video-player") as HTMLElement;
        if (player) {
          const fsButton = player.querySelector(".ytp-fullscreen-button") as HTMLButtonElement;
          if (fsButton) {
            fsButton.click();
            return;
          }
        }
      }

      if (isOdysee) {
        const player = video.closest(".video-js") as HTMLElement;
        if (player) {
          const fsButton = player.querySelector(".vjs-fullscreen-control") as HTMLButtonElement;
          if (fsButton) {
            fsButton.click();
            return;
          }
        }
      }

      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        video.requestFullscreen();
      }
    };

    // Auto-fullscreen when navigating to a video page via feed click
    let hasAutoFullscreened = false;
    let autoFullscreenTimeout: ReturnType<typeof setTimeout> | null = null;

    // Check if video is "active" (being watched - has progress bar/user interaction)
    const isVideoActive = (video: HTMLVideoElement): boolean => {
      // On Odysee, check if user has interacted with the video player
      // Active videos have a progress bar that's been interacted with
      const isOdysee = window.location.hostname.includes("odysee.com");
      const isYouTube = window.location.hostname.includes("youtube.com");

      if (isOdysee) {
        // Check if video has been played before (has progress)
        const player = video.closest(".video-js");
        if (player) {
          // If video has played for more than 5 seconds, consider it active
          if (video.currentTime > 5) return true;
          // If video has been paused and resumed (ended event fired before), it's active
          if (video.played.length > 0 && video.played.end(0) > 5) return true;
        }
      }

      if (isYouTube) {
        // YouTube: if video is past initial buffer, user is watching
        if (video.currentTime > 5) return true;
        if (video.played.length > 0 && video.played.end(0) > 5) return true;
      }

      return false;
    };

    const autoFullscreenOnVideoLoad = () => {
      if (!videoClickFullscreen || hasAutoFullscreened) return;

      // Clear any pending timeout
      if (autoFullscreenTimeout) {
        clearTimeout(autoFullscreenTimeout);
      }

      // Delay slightly to let video state settle
      autoFullscreenTimeout = setTimeout(() => {
        const video = document.querySelector("video");
        if (!video || hasAutoFullscreened) return;

        // Don't auto-fullscreen active (being watched) videos
        if (isVideoActive(video)) {
          console.log("[AutoFullscreen] Video is active (being watched), skipping...");
          return;
        }

        // Only auto-fullscreen if video just started (within first 3 seconds)
        if (video.currentTime < 3 && !document.fullscreenElement) {
          console.log("[AutoFullscreen] New inactive video loaded, fullscreening...");
          hasAutoFullscreened = true;
          enterVideoFullscreen(video as HTMLVideoElement);
        }
      }, 100);
    };

    // Watch for video element and auto-fullscreen on load
    const videoMutationObserver = new MutationObserver(() => {
      const video = document.querySelector("video");
      if (video && !video.dataset.afAutofullscreenWatched) {
        video.dataset.afAutofullscreenWatched = "true";
        video.addEventListener("loadeddata", autoFullscreenOnVideoLoad);
        video.addEventListener("play", autoFullscreenOnVideoLoad, { once: true });
      }
    });

    videoMutationObserver.observe(document.body, { childList: true, subtree: true });

    // Check existing video
    const existingVideo = document.querySelector("video");
    if (existingVideo && !existingVideo.dataset.afAutofullscreenWatched) {
      existingVideo.dataset.afAutofullscreenWatched = "true";
      existingVideo.addEventListener("loadeddata", autoFullscreenOnVideoLoad);
      existingVideo.addEventListener("play", autoFullscreenOnVideoLoad, { once: true });
      autoFullscreenOnVideoLoad();
    }

    // Reset auto-fullscreen flag on navigation
    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        hasAutoFullscreened = false;
        // Re-check for video on new page
        setTimeout(() => {
          const video = document.querySelector("video");
          if (video && !video.dataset.afAutofullscreenWatched) {
            video.dataset.afAutofullscreenWatched = "true";
            video.addEventListener("loadeddata", autoFullscreenOnVideoLoad);
            video.addEventListener("play", autoFullscreenOnVideoLoad);
          }
        }, 500);
      }
    }, 200);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEnabled || !videoKeyFullscreen) return;
      if (e.key.toLowerCase() !== "f") return;
      if ((e.target as Element).closest("input, textarea, [contenteditable]")) return;

      const videos = document.querySelectorAll("video");
      let targetVideo: HTMLVideoElement | null = null;
      let maxArea = 0;

      for (const video of videos) {
        const rect = video.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > maxArea && area > 0) {
          maxArea = area;
          targetVideo = video as HTMLVideoElement;
        }
      }

      if (targetVideo) {
        console.log("[KeyF] Toggling fullscreen on largest video");
        e.preventDefault();
        e.stopPropagation();
        toggleVideoFullscreen(targetVideo);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (longPressTimer) clearTimeout(longPressTimer);

      if (!isEnabled) return;

      const SCROLLBAR_THRESHOLD = 20;
      if (e.clientX >= window.innerWidth - SCROLLBAR_THRESHOLD) return;

      if (e.button !== 0) return;

      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;

      const target = e.target as Element;

      if (videoClickFullscreen) {
        const videoTarget = target.closest("video");
        if (videoTarget) {
          const video = videoTarget as HTMLVideoElement;

          console.log("[VideoClick] tagName:", target.tagName, "paused:", video.paused, "currentTime:", video.currentTime, "duration:", video.duration);

          // Only fullscreen if paused - don't touch playing videos
          if (video.paused) {
            toggleVideoFullscreen(video);
            e.preventDefault();
          }
          return;
        }

        const link = target.closest("a");
        if (link) {
          const href = link.getAttribute("href");
          console.log("[VideoClick] Clicked link:", href);
          if (href && isVideoUrl(href)) {
            return;
          }
        }
      }

      if (strictSafety) {
        if (target) {
          const style = window.getComputedStyle(target);
          if (["pointer", "move", "help", "wait"].includes(style.cursor))
            return;
          if (
            target.closest(
              "a, button, input, textarea, select, label, [role='button'], [role='link'], [role='checkbox'], [role='menuitem'], [role='option'], [role='tab'], [role='slider'], [role='scrollbar'], [role='listbox']",
            )
          )
            return;
        }
      }

      startX = e.clientX;
      startY = e.clientY;

      if (longPressDelay === 0) {
        toggleFullscreen(startX, startY);
        return;
      }

      startCharge(startX, startY);

      longPressTimer = setTimeout(() => {
        toggleFullscreen(startX, startY);
        longPressTimer = null;
      }, longPressDelay);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (topEdgeExitEnabled && e.clientY <= TOP_EDGE_THRESHOLD) {
        browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
        return;
      }

      if (!longPressTimer) return;

      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (dist > MOVEMENT_THRESHOLD) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        cancelCharge();
      }
    };

    const handleMouseUp = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        cancelCharge();
      }
    };

    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      rippleEnabled = newValue.rippleEnabled;
      strictSafety = newValue.strictSafety;
      longPressDelay = newValue.longPressDelay;
      primaryColor = newValue.primaryColor;
      topEdgeExitEnabled = newValue.topEdgeExitEnabled;
      autoFullscreenEnabled = newValue.autoFullscreenEnabled;
      videoClickFullscreen = newValue.videoClickFullscreen;
      videoKeyFullscreen = newValue.videoKeyFullscreen;
      updateStyles();
      if (!isEnabled) {
        browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
      }
    });

    document.addEventListener("mousedown", handleMouseDown, { passive: false });
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp, { passive: true });
    document.addEventListener("dragstart", handleMouseUp, { passive: true });
    document.addEventListener("wheel", handleMouseUp, { passive: true });
    document.addEventListener("keydown", handleKeyDown, { passive: false, capture: true });
    window.addEventListener("scroll", handleMouseUp, { passive: true });
  },
});
