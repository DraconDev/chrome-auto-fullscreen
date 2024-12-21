import { Store } from "@/types/types";

export const defaultStore: Store = {
    exField: "",
};

export const store = storage.defineItem<Store>("sync:store", {
    fallback: defaultStore,
});
