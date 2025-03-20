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

  const toggleInterceptFirstClick = async () => {
    if (state) {
      const newState = {
        ...state,
        interceptFirstClick: !state.interceptFirstClick,
      };
      await store.setValue(newState);
      setState(newState);
    }
  };

  return (
    <div className="w-64 p-4 bg-gray-900">
      <div className="flex flex-col items-center space-y-4">
        <h1 className="text-lg font-semibold text-white">Auto Fullscreen</h1>

        <div className="flex items-center justify-between w-full px-2">
          <span className="text-sm text-gray-300">
            {state?.enabled ? "Enabled" : "Disabled"}
          </span>
          <button
            onClick={toggleEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${state?.enabled ? "bg-blue-500" : "bg-gray-600"}`}
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

        <div className="flex items-center justify-between w-full px-2">
          <span className="text-sm text-gray-300">Click = Fullscreen only</span>
          <button
            onClick={toggleInterceptFirstClick}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${
                              state?.interceptFirstClick
                                ? "bg-blue-500"
                                : "bg-gray-600"
                            }`}
            aria-label={
              state?.interceptFirstClick
                ? "First click only enters fullscreen"
                : "First click can interact with page"
            }
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                ${
                                  state?.interceptFirstClick
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
            />
          </button>
        </div>

        <div className="w-full pt-3 border-t border-gray-700">
          <div className="space-y-2 text-sm text-gray-300">
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
              Click anywhere to enter fullscreen
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
              Move to top edge to exit
            </p>
            {state?.interceptFirstClick && (
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Clicks only switch to fullscreen mode
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end w-full">
          <a
            href="https://ko-fi.com/adamdracon"
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-transform transform hover:scale-125"
          >
            <svg
              className="w-6 h-6 text-[#FF5E5B]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
