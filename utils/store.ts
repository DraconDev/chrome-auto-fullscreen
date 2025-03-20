import { storage } from "wxt/storage";
import { Store } from "@/types/types";

export const defaultStore: Store = {
  env: "",
  enabled: true, // Enable by default
  interceptFirstClick: true, // Enable by default
};

export const store = storage.defineItem<Store>("sync:store", {
  fallback: defaultStore,
});
