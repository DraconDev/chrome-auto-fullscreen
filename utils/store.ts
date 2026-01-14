import { Store } from "@/types/types";
import { storage } from "wxt/storage";

export const defaultStore: Store = {
  env: "",
  enabled: true, // Enable by default
  rippleEnabled: true, // Enable by default
  smartCursorEnabled: true, // Enable by default
  strictSafety: false,
  longPressDelay: 100,
  primaryColor: "#00FFFF",
  topEdgeExitEnabled: true,
};

export const store = storage.defineItem<Store>("sync:store", {
  fallback: defaultStore,
});
