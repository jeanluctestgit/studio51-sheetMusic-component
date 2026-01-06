import { useMemo, useState } from "react";
import { useEditorStore } from "../state/editorStore";
import { getInstrumentById, INSTRUMENTS } from "../music/instruments";
import type { MusicalEvent, Score } from "../music/types";
import { mapTabToPitch } from "../music/mapping";
import styles from "../styles/Inspector.module.css";

const stringifyPitches = (pitches: number[]) => pitches.join(", ");

export const Inspector = () => {
  const {
    score,
    selectedTrackId,
    selectedEventIds,
    setTrackInstrument,
    toggleTrackTab,
    importScore,
    updateEvent,
  } = useEditorStore();
  const [importError, setImportError] = useState<string | null>(null);

  const track = score.tracks.find((item) => item.id === selectedTrackId) ?? score.tracks[0];
  const instrument = getInstrumentById(track.instrumentId);

  const selectedEvents = useMemo(() => {
    return track.measures.flatMap((measure) =>
      measure.voices.flatMap((voice) => voice.events.filter((event) => selectedEventIds.includes(event.id)))
    );
  }, [track, selectedEventIds]);

  const selectedNote = selectedEvents.find((event) => event.type === "note") as MusicalEvent | undefined;

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

  const handlePitchChange = (value: string) => {
    if (!selectedNote) {
      return;
    }
    const pitch = Number(value);
    if (Number.isNaN(pitch)) {
      return;
    }
    updateEvent({
      ...selectedNote,
      pitches: [pitch],
      performanceHints: {
        ...selectedNote.performanceHints,
      },
    });
  };

  const handleDurationChange = (value: string) => {
    if (!selectedNote) {
      return;
    }
    const durationTicks = Number(value);
    if (Number.isNaN(durationTicks)) {
      return;
    }
    updateEvent({
      ...selectedNote,
      durationTicks: Math.max(1, durationTicks),
    });
  };

  const handleStringFretChange = (stringValue: string, fretValue: string) => {
    if (!selectedNote || !instrument.strings) {
      return;
    }
    const stringIndex = Number(stringValue);
    const fret = Number(fretValue);
    if (Number.isNaN(stringIndex) || Number.isNaN(fret)) {
      return;
    }
    const pitch = mapTabToPitch(stringIndex, fret, instrument);
    if (pitch == null) {
      return;
    }
    updateEvent({
      ...selectedNote,
      pitches: [pitch],
      performanceHints: {
        ...selectedNote.performanceHints,
        string: stringIndex,
        fret,
      },
    });
  };

  return (
    <aside className={styles.inspector}>
      <section className={styles.section}>
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
          <label className={styles.toggle}>
            <input type="checkbox" checked={track.showTab} onChange={() => toggleTrackTab(track.id)} />
            Afficher la tablature
          </label>
        )}
      </section>

      <section className={styles.section}>
        <h2>Note sélectionnée</h2>
        {selectedNote ? (
          <div className={styles.grid}>
            <label>
              Pitch (MIDI)
              <input
                type="number"
                value={selectedNote.pitches[0] ?? 60}
                onChange={(event) => handlePitchChange(event.target.value)}
              />
            </label>
            <label>
              Durée (ticks)
              <input
                type="number"
                value={selectedNote.durationTicks}
                onChange={(event) => handleDurationChange(event.target.value)}
              />
            </label>
            <label>
              Pitches
              <input type="text" value={stringifyPitches(selectedNote.pitches)} readOnly />
            </label>
            {instrument.strings && (
              <label>
                String / Fret
                <div className={styles.row}>
                  <input
                    type="number"
                    min={0}
                    max={(instrument.strings?.length ?? 1) - 1}
                    value={selectedNote.performanceHints.string ?? 0}
                    onChange={(event) =>
                      handleStringFretChange(event.target.value, String(selectedNote.performanceHints.fret ?? 0))
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={selectedNote.performanceHints.fret ?? 0}
                    onChange={(event) =>
                      handleStringFretChange(String(selectedNote.performanceHints.string ?? 0), event.target.value)
                    }
                  />
                </div>
              </label>
            )}
            <label>
              Articulations
              <span>{selectedNote.articulations.join(", ") || "Aucune"}</span>
            </label>
            <label>
              Effets
              <span>{selectedNote.effects.join(", ") || "Aucun"}</span>
            </label>
          </div>
        ) : (
          <p>Aucune note sélectionnée.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2>Mesure</h2>
        <p>
          Signature rythmique : {score.timeSignature.beats}/{score.timeSignature.beatUnit}
        </p>
        <p>Armature : {score.keySignature}</p>
      </section>

      <section className={styles.section}>
        <h2>Import / Export</h2>
        <button type="button" onClick={downloadJson}>
          Export JSON
        </button>
        <label className={styles.file}>
          Import JSON
          <input type="file" accept="application/json" onChange={(event) => handleImport(event.target.files?.[0] ?? null)} />
        </label>
        {importError && <p className={styles.error}>{importError}</p>}
      </section>
    </aside>
  );
};
