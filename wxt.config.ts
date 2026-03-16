import { defineConfig } from "wxt";

export default defineConfig({
  extensionApi: "chrome",
  manifest: {
    name: "Auto Fullscreen",
    description:
      "Turbo Long Press fullscreen toggle. Intelligently respects your workflow with customizable charge timing and colors.",
    version: "1.4.2",
    permissions: ["storage", "debugger"],
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
    web_accessible_resources: [
      { resources: ["settings.html"], matches: ["<all_urls>"] },
    ],
  },
  modules: ["@wxt-dev/module-react"],
});
