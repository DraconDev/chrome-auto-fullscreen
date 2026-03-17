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
      className="w-full flex items-center justify-between px-5 py-4 rounded-2xl
        bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left group"
    >
      <div className="flex-1 min-w-0 pr-4">
        <span className="text-[15px] text-gray-200 block">{label}</span>
        {hint && <span className="text-xs text-gray-500 block mt-1">{hint}</span>}
      </div>
      <div className={`w-11 h-6 rounded-full relative transition-colors shrink-0
        ${checked ? "bg-cyan-500" : "bg-gray-700"}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
          ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </div>
    </button>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );

  if (!state) {
    return (
      <div className="min-h-screen bg-[#08080d] flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080d] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#0a0a10]">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Auto Fullscreen</h1>
              <p className="text-sm text-gray-500 mt-1">Configure your fullscreen experience</p>
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider
              ${state.enabled
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                : "bg-gray-800 text-gray-500 border border-gray-700"}`}>
              {state.enabled ? "Active" : "Off"}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-10">

        <Section title="Core">
          <Toggle label="Enabled" hint="Master toggle for the extension"
            checked={state.enabled}
            onChange={() => update({ enabled: !state.enabled })} />
          <Toggle label="Fullscreen on page load"
            hint="Automatically fullscreen when navigating to any page"
            checked={state.autoFullscreenEnabled}
            onChange={() => update({ autoFullscreenEnabled: !state.autoFullscreenEnabled })} />
          <Toggle label="Fullscreen on SPA navigation"
            hint="Detect navigation on single-page apps like YouTube and Odysee via URL changes"
            checked={state.autoFullscreenOnNewVideo}
            onChange={() => update({ autoFullscreenOnNewVideo: !state.autoFullscreenOnNewVideo })} />
        </Section>

        <Section title="Interaction">
          <Toggle label="Never auto-exit on click"
            hint="Click or charge only enters fullscreen, never exits. Use top edge to exit instead."
            checked={state.oneWayFullscreen}
            onChange={() => update({ oneWayFullscreen: !state.oneWayFullscreen })} />
          <Toggle label="Exit on top edge"
            hint="Move cursor to the top edge of the screen to exit fullscreen"
            checked={state.topEdgeExitEnabled}
            onChange={() => update({ topEdgeExitEnabled: !state.topEdgeExitEnabled })} />
          <Toggle label="Block on links and buttons"
            hint="Prevent fullscreen when clicking interactive elements like links, buttons, or form inputs"
            checked={state.strictSafety}
            onChange={() => update({ strictSafety: !state.strictSafety })} />
        </Section>

        <Section title="Customization">
          <Toggle label="Charge animation"
            hint="Show a ring animation while holding the click"
            checked={state.rippleEnabled}
            onChange={() => update({ rippleEnabled: !state.rippleEnabled })} />

          {/* Charge Time Slider */}
          <div className="px-5 py-4 rounded-2xl bg-white/[0.03]">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="text-[15px] text-gray-200 block">Charge time</span>
                <span className="text-xs text-gray-500 block mt-1">
                  How long to hold click before fullscreen activates
                </span>
              </div>
              <span className="text-sm font-mono text-cyan-400 ml-4 shrink-0">
                {state.longPressDelay === 0 ? "instant" : `${state.longPressDelay}ms`}
              </span>
            </div>
            <input type="range" min="0" max="1000" step="20"
              value={state.longPressDelay}
              onChange={(e) => update({ longPressDelay: parseInt(e.target.value) || 0 })}
              className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:hover:bg-cyan-300
                [&::-webkit-slider-thumb]:transition-colors" />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>0ms</span><span>1000ms</span>
            </div>
          </div>

          {/* Color Picker */}
          <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/[0.03]">
            <div>
              <span className="text-[15px] text-gray-200 block">Theme color</span>
              <span className="text-xs text-gray-500 block mt-1">
                Used for the charge ring animation
              </span>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <span className="text-sm font-mono text-gray-400">
                {state.primaryColor}
              </span>
              <input type="color"
                value={state.primaryColor}
                onChange={(e) => update({ primaryColor: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-gray-600 p-0.5" />
            </div>
          </div>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-8">
        <div className="max-w-2xl mx-auto px-6 py-5 flex justify-between items-center text-sm text-gray-600">
          <span>Auto Fullscreen v1.5</span>
          <a href="https://ko-fi.com/adamdracon" target="_blank" rel="noopener noreferrer"
            className="hover:text-gray-400 transition-colors">
            Support
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
