import { Store } from "@/types/types";
import { store } from "@/utils/store";
import { useEffect, useState } from "react";

function App() {
  const [state, setState] = useState<Store | null>(null);

  useEffect(() => {
    let mounted = true;
    store.getValue().then((s) => { if (mounted) setState(s); });
    const unwatch = store.watch((nv) => { if (mounted && nv) setState(nv); });
    return () => { mounted = false; unwatch(); };
  }, []);

  const update = async (updates: Partial<Store>) => {
    if (!state) return;
    const next = { ...state, ...updates };
    await store.setValue(next);
    setState(next);
  };

  const openSettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("/settings.html") });
  };

  return (
    <div className="w-[280px] bg-[#0a0a0f] text-white font-sans p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold">Auto Fullscreen</h1>
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
          ${state?.enabled
            ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
            : "bg-gray-800 text-gray-500 border border-gray-700"}`}>
          {state?.enabled ? "Active" : "Off"}
        </div>
      </div>

      {/* Master Toggle */}
      <button
        onClick={() => update({ enabled: !state?.enabled })}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl
          bg-white/[0.04] hover:bg-white/[0.07] transition-colors text-left"
      >
        <span className="text-sm text-gray-200">Enabled</span>
        <div className={`w-9 h-5 rounded-full relative transition-colors
          ${state?.enabled ? "bg-cyan-500" : "bg-gray-600"}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
            ${state?.enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
        </div>
      </button>

      {/* Quick Info */}
      <p className="text-[11px] text-gray-500 px-1">
        {state?.longPressDelay === 0
          ? "Click to toggle fullscreen"
          : `Hold click ${state?.longPressDelay ?? 200}ms to toggle`}
      </p>

      {/* Settings Button */}
      <button
        onClick={openSettings}
        className="w-full px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20
          text-cyan-400 text-sm font-medium transition-colors border border-cyan-500/20"
      >
        Open Settings
      </button>
    </div>
  );
}

export default App;
