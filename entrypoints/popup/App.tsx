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
          </div>
        </div>

        <div className="flex justify-end w-full pt-2">
          <a
            href="https://ko-fi.com/adamdracon"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 bg-[#FF5E5B] text-white text-sm font-medium rounded-md hover:bg-[#FF5E5B]/90 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
