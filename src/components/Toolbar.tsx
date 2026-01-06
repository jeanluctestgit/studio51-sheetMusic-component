import { useScoreStore } from "../store/scoreStore";

const tools = [
  { id: "select", label: "Select", icon: "↖" },
  { id: "note", label: "Note", icon: "♪" },
  { id: "rest", label: "Rest", icon: "𝄽" },
  { id: "erase", label: "Erase", icon: "⌫" },
] as const;

const durations = [
  { label: "1/1", ticks: 1920 },
  { label: "1/2", ticks: 960 },
  { label: "1/4", ticks: 480 },
  { label: "1/8", ticks: 240 },
  { label: "1/16", ticks: 120 },
  { label: "1/32", ticks: 60 },
];

export const Toolbar = () => {
  const { activeTool, setTool, activeDurationTicks, setActiveDurationTicks } = useScoreStore();

  return (
    <aside className="flex h-full flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="space-y-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => setTool(tool.id)}
            className={`flex w-full flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
              activeTool === tool.id
                ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400"
                : "text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <span className="text-lg">{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Duration</p>
        {durations.map((duration) => (
          <button
            key={duration.label}
            type="button"
            onClick={() => setActiveDurationTicks(duration.ticks)}
            className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition ${
              activeDurationTicks === duration.ticks
                ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400"
                : "text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            {duration.label}
          </button>
        ))}
      </div>
    </aside>
  );
};
