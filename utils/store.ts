import { Store } from "@/types/types";
import { storage } from "wxt/storage";

export const defaultStore: Store = {
  env: "",
  enabled: true,
  rippleEnabled: true,
  smartCursorEnabled: true,
  strictSafety: true,
  longPressDelay: 200,
  primaryColor: "#00FFFF",
  topEdgeExitEnabled: true,
  autoFullscreenEnabled: true,
  oneWayFullscreen: false,
  autoFullscreenOnNewVideo: true,
  fullscreenVideo: false,
};

export const store = storage.defineItem<Store>("sync:store", {
  fallback: defaultStore,
});
