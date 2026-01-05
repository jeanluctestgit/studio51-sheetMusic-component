import { useMemo, useState } from "react";
import { useEditorStore } from "../editor/store";
import { getInstrumentById, INSTRUMENTS } from "../music/instruments";
import type { Score } from "../music/types";

export const Inspector = () => {
  const {
    score,
    selectedTrackId,
    selectedEventIds,
    setTrackInstrument,
    toggleTrackTab,
    importScore,
  } = useEditorStore();
  const [importError, setImportError] = useState<string | null>(null);

  const track = score.tracks.find((item) => item.id === selectedTrackId) ?? score.tracks[0];
  const instrument = getInstrumentById(track.instrumentId);

  const selectedEvents = useMemo(() => {
    return track.measures.flatMap((measure) =>
      measure.voices.flatMap((voice) => voice.events.filter((event) => selectedEventIds.includes(event.id)))
    );
  }, [track, selectedEventIds]);

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(score, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "score.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File | null) => {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Score;
        importScore(parsed);
        setImportError(null);
      } catch (error) {
        setImportError("Fichier JSON invalide.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <aside className="inspector">
      <section className="inspector__section">
        <h2>Piste active</h2>
        <label>
          Instrument
          <select
            value={track.instrumentId ?? "generic"}
            onChange={(event) => setTrackInstrument(track.id, event.target.value)}
          >
            {INSTRUMENTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {instrument.strings && (
          <label className="inspector__toggle">
            <input
              type="checkbox"
              checked={track.showTab}
              onChange={() => toggleTrackTab(track.id)}
            />
            Afficher la tablature
          </label>
        )}
      </section>

      <section className="inspector__section">
        <h2>Sélection</h2>
        {selectedEvents.length === 0 ? (
          <p>Aucune note sélectionnée.</p>
        ) : (
          <ul>
            {selectedEvents.map((event) => (
              <li key={event.id}>
                {event.type} @ {event.startTick} ticks
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="inspector__section">
        <h2>Import / Export</h2>
        <button type="button" onClick={downloadJson}>
          Export JSON
        </button>
        <label className="inspector__file">
          Import JSON
          <input
            type="file"
            accept="application/json"
            onChange={(event) => handleImport(event.target.files?.[0] ?? null)}
          />
        </label>
        {importError && <p className="inspector__error">{importError}</p>}
      </section>
    </aside>
  );
};
