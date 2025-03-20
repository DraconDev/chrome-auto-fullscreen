import { defineConfig } from "wxt";

export default defineConfig({
  extensionApi: "chrome",
  manifest: {
    name: "Auto Fullscreen",
    description:
      "Click anywhere to enter fullscreen mode, move cursor to top edge to exit. Simple and intuitive.",
    version: "1.1.10",
    permissions: ["storage"],
    host_permissions: ["<all_urls>"],
    icons: {
      "16": "icon/16.png",
      "32": "icon/32.png",
      "48": "icon/48.png",
      "96": "icon/96.png",
      "128": "icon/128.png",
    },
    action: {
      default_popup: "popup.html",
      default_icon: {
        "16": "icon/16.png",
        "32": "icon/32.png",
        "48": "icon/48.png",
        "128": "icon/128.png",
      },
      default_title: "Auto Fullscreen",
    },
  },
  modules: ["@wxt-dev/module-react"],
});
