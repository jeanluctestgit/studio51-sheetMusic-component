import { useMemo, useState } from "react";
import { useScoreStore } from "../store/scoreStore";
import { INSTRUMENTS } from "../music/mapping";

export const Inspector = () => {
  const {
    selection,
    getEventById,
    score,
    setInstrument,
    exportScore,
    importScore,
  } = useScoreStore();
  const [jsonDraft, setJsonDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedEvent = useMemo(() => {
    const id = selection[0];
    return id ? getEventById(id) : undefined;
  }, [getEventById, selection]);

  const handleExport = () => {
    setJsonDraft(exportScore());
    setError(null);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonDraft);
      importScore(parsed);
      setError(null);
    } catch {
      setError("Invalid JSON payload.");
    }
  };

  return (
    <aside className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
      <div>
        <h2 className="text-xs uppercase tracking-[0.3em] text-slate-500">Inspector</h2>
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-slate-300">
            Selection: <span className="font-semibold text-slate-100">{selection.length}</span>
          </p>
          {selectedEvent && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs">
              <p className="text-slate-400">{selectedEvent.type.toUpperCase()}</p>
              <p>Start: {selectedEvent.startTick} ticks</p>
              <p>Duration: {selectedEvent.durationTicks} ticks</p>
              {selectedEvent.type === "note" && <p>Pitch: MIDI {selectedEvent.pitchMidi}</p>}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.3em] text-slate-500">Instrument</h3>
        <select
          value={score.tracks[0].instrumentId}
          onChange={(event) => setInstrument(event.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
        >
          {Object.values(INSTRUMENTS).map((instrument) => (
            <option key={instrument.id} value={instrument.id}>
              {instrument.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-[0.3em] text-slate-500">Score JSON</h3>
        <textarea
          value={jsonDraft}
          onChange={(event) => setJsonDraft(event.target.value)}
          placeholder="Export to edit or paste JSON to import."
          className="min-h-[160px] w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 rounded-lg bg-sky-500/20 px-3 py-2 text-xs font-semibold text-sky-200"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="flex-1 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200"
          >
            Import JSON
          </button>
        </div>
      </div>
    </aside>
  );
};
