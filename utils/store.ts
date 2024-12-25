import { Store } from "@/types/types";

export const defaultStore: Store = {
    env: "",
};

export const store = storage.defineItem<Store>("sync:store", {
    fallback: defaultStore,
});
