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
    <div className="p-4 w-72 bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <h1 className="text-lg font-semibold text-gray-800">Auto Fullscreen</h1>

        <div className="flex items-center justify-between w-full px-2">
          <span className="text-sm text-gray-600">
            {state?.enabled ? "Enabled" : "Disabled"}
          </span>
          <button
            onClick={toggleEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${state?.enabled ? "bg-blue-600" : "bg-gray-300"}`}
            aria-label={
              state?.enabled
                ? "Disable Auto Fullscreen"
                : "Enable Auto Fullscreen"
            }
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                ${
                                  state?.enabled
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
            />
          </button>
        </div>

        <div className="w-full pt-3 border-t border-gray-200">
          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
              Hover over any webpage
            </p>
            <p className="flex items-center">
              <svg
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              Move cursor to top to exit
            </p>
          </div>
        </div>

        <div className="text-xs text-center text-gray-400">
          Activation delay: 0.75s
        </div>
      </div>
    </div>
  );
}

export default App;
