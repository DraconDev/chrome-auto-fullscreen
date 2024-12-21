import { useState, useEffect } from "react";
import reactLogo from "@/assets/react.svg";
import wxtLogo from "/wxt.svg";
import { Store } from "@/types/types";
import { store } from "@/utils/store";

function App() {
    const [state, setState] = useState<Store | null>(null);

    useEffect(() => {
        if (!state) {
            (async () => {
                const currentState = await store.getValue();
                setState(currentState);
            })();
        }
        store.watch((newValue) => {
            if (newValue) {
                setState(newValue);
            }
        });
    }, []);

    return <></>;
}

export default App;
