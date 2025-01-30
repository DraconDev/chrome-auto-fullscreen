import { defineConfig } from "wxt";

export default defineConfig({
  extensionApi: "chrome",
  manifest: {
    name: "Auto Fullscreen",
    description:
      "Automatically enters fullscreen mode when hovering over webpages. Move cursor to top to exit. Simple and intuitive.",
    version: "0.0.22",
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
