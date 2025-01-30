import { useState, useEffect } from "react";
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

  const toggleEnabled = async () => {
    if (state) {
      const newState = { ...state, enabled: !state.enabled };
      await store.setValue(newState);
      setState(newState);
    }
  };

  return (
    <div className="w-64 p-4 bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <h1 className="text-lg font-semibold text-gray-800">Auto Fullscreen</h1>

        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            {state?.enabled ? "Enabled" : "Disabled"}
          </span>
          <button
            onClick={toggleEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full
                            ${state?.enabled ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition
                                ${
                                  state?.enabled
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
            />
          </button>
        </div>

        <div className="text-xs text-center text-gray-500">
          Hover over any webpage to enter fullscreen.
          <br />
          Move cursor to top to exit.
        </div>
      </div>
    </div>
  );
}

export default App;
