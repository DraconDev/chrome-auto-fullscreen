import { store } from "@/utils/store";
import { defineContentScript } from "wxt/sandbox";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    let isEnabled = (await store.getValue()).enabled;
    let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;

    // --- Cache new-tab intent LOCALLY (not re-queried from background) ---
    // This is the key fix: once we know Ctrl/MMB was used, we remember it
    // for the entire page lifecycle. Re-querying the background would fail
    // because the background clears the flag on first read.

    let newTabIntent = false;

    // Query background ONCE on load and cache the result
    const resp = await browser.runtime.sendMessage({
      action: "getModifierState",
    });
    if (resp?.ctrlHeld) {
      newTabIntent = true;
    }

    // Report future modifier changes to background (for OTHER tabs)
    const reportModifiers = (e: MouseEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const mmb = e.button === 1;
      browser.runtime.sendMessage({
        action: "setModifiers",
        ctrl: ctrl || mmb,
      });
    };

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        browser.runtime.sendMessage({ action: "setModifiers", ctrl: true });
      }
    });
    document.addEventListener("keyup", (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        browser.runtime.sendMessage({ action: "setModifiers", ctrl: false });
      }
    });
    document.addEventListener("mousedown", reportModifiers, true);

    // --- Find videos including inside shadow DOM ---

    const findAllVideos = (root: Document | Element | ShadowRoot): HTMLVideoElement[] => {
      const videos: HTMLVideoElement[] = [];
      const walk = (node: Element | ShadowRoot) => {
        if (node instanceof HTMLVideoElement) {
          videos.push(node);
          return;
        }
        const children = "querySelectorAll" in node ? node.querySelectorAll("video") : [];
        videos.push(...(children as NodeListOf<HTMLVideoElement>));
        // Traverse shadow DOMs
        const all = "querySelectorAll" in node ? node.querySelectorAll("*") : [];
        for (const el of all) {
          if (el.shadowRoot) walk(el.shadowRoot);
        }
      };
      walk(root);
      return videos;
    };

    // --- Send F key when a new video starts playing ---

    const seenVideos = new Set<HTMLVideoElement>();

    const onVideoPlay = (video: HTMLVideoElement) => {
      if (!isEnabled || !autoFullscreenEnabled) return;
      if (newTabIntent) return;
      // Only main player videos
      if (video.offsetWidth < 200 || video.offsetHeight < 150) return;

      // Wait a bit for currentSrc to populate
      setTimeout(() => {
        const src = video.currentSrc || video.src;
        if (!src) return;
        if (seenVideos.has(video)) return;
        seenVideos.add(video);

        browser.runtime.sendMessage({ action: "sendFKey" });
      }, 200);
    };

    // Poll for videos (handles Shadow DOM and dynamic loading)
    setInterval(() => {
      const videos = findAllVideos(document);
      for (const video of videos) {
        if (!seenVideos.has(video)) {
          seenVideos.add(video);
          video.addEventListener("play", () => onVideoPlay(video));
        }
      }
    }, 500);

    // --- Auto-fullscreen on initial load (window-level) ---

    if (isEnabled && autoFullscreenEnabled && !newTabIntent) {
      browser.runtime.sendMessage({ action: "setWindowFullscreen" });
    }

    // --- Hide fullscreen exit instructions ---

    const style = document.createElement("style");
    style.textContent = `
      .Chrome-Full-Screen-Exit-Instruction { display: none !important; }
      .Full-Screen-Exit-Instruction { display: none !important; }
    `;
    document.head.appendChild(style);

    // --- Settings watcher ---

    store.watch((newValue) => {
      isEnabled = newValue.enabled;
      autoFullscreenEnabled = newValue.autoFullscreenEnabled;
      if (!isEnabled) {
        browser.runtime.sendMessage({ action: "exitWindowFullscreen" });
      }
    });
  },
});
