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

  const Toggle = ({ label, hint, checked, onChange }: {
    label: string; hint?: string; checked: boolean; onChange: () => void;
  }) => (
    <button
      onClick={onChange}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl
        bg-white/[0.04] hover:bg-white/[0.07] transition-colors group text-left"
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-200 block">{label}</span>
        {hint && <span className="text-[11px] text-gray-500 block mt-0.5">{hint}</span>}
      </div>
      <div className={`ml-3 w-9 h-5 rounded-full relative transition-colors shrink-0
        ${checked ? "bg-cyan-500" : "bg-gray-600"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
          ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </div>
    </button>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1 mb-2">
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div className="w-[340px] bg-[#0a0a0f] text-white font-sans flex flex-col"
      style={{ minHeight: 420, maxHeight: 580 }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold tracking-tight text-white">
            Auto Fullscreen
          </h1>
          <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
            ${state?.enabled
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
              : "bg-gray-800 text-gray-500 border border-gray-700"}`}>
            {state?.enabled ? "Active" : "Off"}
          </div>
        </div>
        <p className="text-[11px] text-gray-500">
          {state?.longPressDelay === 0
            ? "Click anywhere to toggle fullscreen"
            : `Hold click ${state?.longPressDelay ?? 200}ms to toggle fullscreen`}
        </p>
      </div>

      <div className="flex-1 px-5 pb-4 space-y-5 overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>

        {/* Core */}
        <Section title="Core">
          <Toggle label="Enabled" hint="Master toggle for the extension"
            checked={!!state?.enabled}
            onChange={() => update({ enabled: !state?.enabled })} />
          <Toggle label="Fullscreen on load" hint="Auto fullscreen when any page loads"
            checked={!!state?.autoFullscreenEnabled}
            onChange={() => update({ autoFullscreenEnabled: !state?.autoFullscreenEnabled })} />
          <Toggle label="Fullscreen on navigation" hint="Detect SPA navigation (YouTube, Odysee)"
            checked={!!state?.autoFullscreenOnNewVideo}
            onChange={() => update({ autoFullscreenOnNewVideo: !state?.autoFullscreenOnNewVideo })} />
        </Section>

        {/* Interaction */}
        <Section title="Interaction">
          <Toggle label="Never auto-exit" hint="Click/charge only enters, never exits"
            checked={!!state?.oneWayFullscreen}
            onChange={() => update({ oneWayFullscreen: !state?.oneWayFullscreen })} />
          <Toggle label="Exit on top edge" hint="Move cursor to top of screen to exit"
            checked={!!state?.topEdgeExitEnabled}
            onChange={() => update({ topEdgeExitEnabled: !state?.topEdgeExitEnabled })} />
          <Toggle label="Block on links/buttons" hint="Don't fullscreen when clicking interactive elements"
            checked={!!state?.strictSafety}
            onChange={() => update({ strictSafety: !state?.strictSafety })} />
        </Section>

        {/* Video */}
        <Section title="Video">
          <Toggle label="Fullscreen video (F key)" hint="Also fullscreen the video element on click"
            checked={!!state?.fullscreenVideo}
            onChange={() => update({ fullscreenVideo: !state?.fullscreenVideo })} />
        </Section>

        {/* Customization */}
        <Section title="Customization">
          <Toggle label="Charge FX" hint="Visual ring during charge"
            checked={!!state?.rippleEnabled}
            onChange={() => update({ rippleEnabled: !state?.rippleEnabled })} />

          {/* Charge Time */}
          <div className="px-4 py-3 rounded-xl bg-white/[0.04]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-200">Charge time</span>
              <span className="text-xs font-mono text-cyan-400">
                {state?.longPressDelay === 0 ? "instant" : `${state?.longPressDelay ?? 200}ms`}
              </span>
            </div>
            <input type="range" min="0" max="1000" step="20"
              value={state?.longPressDelay ?? 200}
              onChange={(e) => update({ longPressDelay: parseInt(e.target.value) || 0 })}
              className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
                [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:cursor-pointer" />
          </div>

          {/* Color */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04]">
            <span className="text-sm text-gray-200">Theme color</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400">
                {state?.primaryColor || "#00FFFF"}
              </span>
              <input type="color"
                value={state?.primaryColor || "#00FFFF"}
                onChange={(e) => update({ primaryColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border border-gray-600 p-0" />
            </div>
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/[0.06] flex justify-between items-center text-[11px] text-gray-600">
        <span>v1.5</span>
        <a href="https://ko-fi.com/adamdracon" target="_blank" rel="noopener noreferrer"
          className="hover:text-gray-400 transition-colors">
          Support
        </a>
      </div>
    </div>
  );
}

export default App;
