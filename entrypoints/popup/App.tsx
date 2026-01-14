import { Store } from "@/types/types";
import { store } from "@/utils/store";
import { useEffect, useState } from "react";

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

  const updateState = async (updates: Partial<Store>) => {
    if (state) {
      const newState = { ...state, ...updates };
      await store.setValue(newState);
      setState(newState);
    }
  };

  const Toggle = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <div className="flex items-center justify-between w-full p-3 transition-colors bg-gray-800 rounded-lg hover:bg-gray-750 group">
      <span className="text-sm font-medium text-gray-200">{label}</span>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
          ${checked ? "bg-blue-600" : "bg-gray-600"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-[400px] w-[320px] bg-gray-900 text-white font-sans selection:bg-blue-500 selection:text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-br from-gray-800 to-gray-900 border-b border-gray-700 shadow-md">
        <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
          Auto Fullscreen
        </h1>
        <div
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            state?.enabled
              ? "bg-blue-500/20 text-blue-300"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          {state?.enabled ? "Active" : "Off"}
        </div>
      </div>

      <div className="flex-1 p-5 space-y-5 overflow-y-auto custom-scrollbar">
        {/* Quick Tip */}
        <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 shadow-sm">
          <p className="text-[11px] text-blue-400 leading-relaxed text-center font-medium">
            Hold left-click <span className="text-white">in place</span> for{" "}
            <span className="text-cyan-400">
              {(state?.longPressDelay || 100) / 1000}s
            </span>{" "}
            to toggle fullscreen.
          </p>
        </div>

        {/* Main Controls */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">
            Behavior
          </h2>

          <Toggle
            label="Enable Extension"
            checked={!!state?.enabled}
            onChange={() => updateState({ enabled: !state?.enabled })}
          />

          <Toggle
            label="Block on buttons/links"
            checked={!!state?.strictSafety}
            onChange={() => updateState({ strictSafety: !state?.strictSafety })}
          />

          <Toggle
            label="Exit on top edge"
            checked={!!state?.topEdgeExitEnabled}
            onChange={() =>
              updateState({ topEdgeExitEnabled: !state?.topEdgeExitEnabled })
            }
          />
        </div>

        {/* Visuals */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">
            Visuals
          </h2>
          <Toggle
            label="Charge FX"
            checked={!!state?.rippleEnabled}
            onChange={() =>
              updateState({ rippleEnabled: !state?.rippleEnabled })
            }
          />

          {/* Customization */}
          <div className="pt-2 border-t border-gray-700/50 space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">
              Customization
            </h2>

            {/* Charge Time Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs text-gray-300">
                <span>Charge Time</span>
                <span className="font-mono text-cyan-400">
                  {(state?.longPressDelay || 100) / 1000}s
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="20"
                value={state?.longPressDelay || 200}
                onChange={(e) =>
                  updateState({ longPressDelay: parseInt(e.target.value) })
                }
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Color Picker */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-300">Theme Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={state?.primaryColor || "#00FFFF"}
                  onChange={(e) =>
                    updateState({ primaryColor: e.target.value })
                  }
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Automation (Removed) */}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-900 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500">
        <span>v1.3.0</span>
        <a
          href="https://ko-fi.com/adamdracon"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1 text-gray-400 hover:text-[#FF5E5B] transition-colors group"
        >
          <span>Support</span>
          <svg
            className="w-4 h-4 transition-transform transform group-hover:scale-110 text-[#FF5E5B]"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export default App;
