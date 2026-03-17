import { defineConfig } from "wxt";

export default defineConfig({
  extensionApi: "chrome",
  manifest: {
    name: "Auto Fullscreen",
    description:
      "Auto fullscreen any page on load, navigation, or click-and-hold. Works everywhere - not just videos.",
    version: "2.0.0",
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
      default_icon: {
        "16": "icon/16.png",
        "32": "icon/32.png",
        "48": "icon/48.png",
        "128": "icon/128.png",
      },
      default_title: "Auto Fullscreen — Settings",
    },
    web_accessible_resources: [
      { resources: ["settings.html"], matches: ["<all_urls>"] },
    ],
  },
  modules: ["@wxt-dev/module-react"],
});
