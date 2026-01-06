import { useMemo, useState } from "react";
import { useEditorStore } from "../state/editorStore";
import { INSTRUMENTS, getInstrumentById } from "../music/instruments";
import type { Articulation, Effect, KeySignature, Ornament, ToolId } from "../music/types";
import { SCALES } from "../music/scales";
import styles from "../styles/Toolbar.module.css";

const TOOLS: { id: ToolId; label: string }[] = [
  { id: "select", label: "Sélection" },
  { id: "note", label: "Note" },
  { id: "rest", label: "Silence" },
  { id: "erase", label: "Gomme" },
];

const DURATIONS: { value: "1/1" | "1/2" | "1/4" | "1/8" | "1/16" | "1/32"; label: string }[] = [
  { value: "1/1", label: "Ronde" },
  { value: "1/2", label: "Blanche" },
  { value: "1/4", label: "Noire" },
  { value: "1/8", label: "Croche" },
  { value: "1/16", label: "Double" },
  { value: "1/32", label: "Triple" },
];

const ARTICULATIONS: { value: Articulation; label: string }[] = [
  { value: "staccato", label: "Staccato" },
  { value: "accent", label: "Accent" },
  { value: "tenuto", label: "Tenuto" },
  { value: "slur", label: "Slur" },
  { value: "tie", label: "Tie" },
];

const ORNAMENTS: { value: Ornament; label: string }[] = [
  { value: "trill", label: "Trille" },
  { value: "mordent", label: "Mordant" },
];

const GUITAR_EFFECTS: { value: Effect; label: string }[] = [
  { value: "slide", label: "Slide" },
  { value: "hammer-on", label: "Hammer-on" },
  { value: "pull-off", label: "Pull-off" },
  { value: "bend", label: "Bend" },
  { value: "vibrato", label: "Vibrato" },
  { value: "palm-mute", label: "Palm mute" },
  { value: "let-ring", label: "Let ring" },
  { value: "harmonic", label: "Harmonics" },
];

const TIME_SIGNATURES = [
  { beats: 4, beatUnit: 4, label: "4/4" },
  { beats: 3, beatUnit: 4, label: "3/4" },
  { beats: 6, beatUnit: 8, label: "6/8" },
];

const KEY_SIGNATURES: KeySignature[] = ["C", "G", "D", "A", "E", "F", "Bb", "Eb"];

const SCALE_ROOTS = [
  { label: "C", midi: 60 },
  { label: "C#", midi: 61 },
  { label: "D", midi: 62 },
  { label: "D#", midi: 63 },
  { label: "E", midi: 64 },
  { label: "F", midi: 65 },
  { label: "F#", midi: 66 },
  { label: "G", midi: 67 },
  { label: "G#", midi: 68 },
  { label: "A", midi: 69 },
  { label: "A#", midi: 70 },
  { label: "B", midi: 71 },
];

export const Toolbar = () => {
  const {
    activeTool,
    setTool,
    duration,
    setDuration,
    dotted,
    toggleDotted,
    triplet,
    toggleTriplet,
    score,
    setTimeSignature,
    setKeySignature,
    activeArticulations,
    toggleArticulation,
    activeOrnaments,
    toggleOrnament,
    activeEffects,
    toggleEffect,
    selectedTrackId,
    addChordSymbol,
    caretTick,
    activeScaleId,
    setScale,
    scaleRootMidi,
    setScaleRoot,
    activeFret,
    setActiveFret,
    isPlaying,
    play,
    stop,
    setTempoBpm,
  } = useEditorStore();

  const [chordInput, setChordInput] = useState("");

  const track = score.tracks.find((item) => item.id === selectedTrackId) ?? score.tracks[0];
  const instrument = getInstrumentById(track.instrumentId);
  const showGuitar = instrument.category === "guitar";

  const timeSignatureLabel = useMemo(
    () => `${score.timeSignature.beats}/${score.timeSignature.beatUnit}`,
    [score.timeSignature]
  );

  return (
    <aside className={styles.toolbar}>
      <section className={styles.section}>
        <p className={styles.title}>Transport</p>
        <div className={styles.row}>
          <button type="button" className={styles.button} onClick={() => (isPlaying ? stop() : play())}>
            {isPlaying ? "Stop" : "Play"}
          </button>
          <label className={styles.label}>
            Tempo
            <input
              type="number"
              min={40}
              max={240}
              value={score.tempoBpm}
              onChange={(event) => setTempoBpm(Number(event.target.value))}
            />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.title}>Outils</p>
        <div className={styles.grid}>
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`${styles.button} ${activeTool === tool.id ? styles.buttonActive : ""}`}
              onClick={() => setTool(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.title}>Durée</p>
        <div className={styles.grid}>
          {DURATIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`${styles.button} ${duration === item.value ? styles.buttonActive : ""}`}
              onClick={() => setDuration(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className={styles.grid}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSmall} ${dotted ? styles.buttonActive : ""}`}
            onClick={toggleDotted}
          >
            Pointé
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSmall} ${triplet ? styles.buttonActive : ""}`}
            onClick={toggleTriplet}
          >
            Triolet
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.title}>Signature</p>
        <div className={styles.row}>
          <label className={styles.label}>
            Armature
            <select
              value={score.keySignature}
              onChange={(event) => setKeySignature(event.target.value as KeySignature)}
            >
              {KEY_SIGNATURES.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            Rythme
            <select
              value={timeSignatureLabel}
              onChange={(event) => {
                const selected = TIME_SIGNATURES.find((item) => item.label === event.target.value);
                if (selected) {
                  setTimeSignature({ beats: selected.beats, beatUnit: selected.beatUnit });
                }
              }}
            >
              {TIME_SIGNATURES.map((item) => (
                <option key={item.label} value={item.label}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.title}>Articulations</p>
        <div className={styles.grid}>
          {ARTICULATIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`${styles.button} ${styles.buttonSmall} ${
                activeArticulations.includes(item.value) ? styles.buttonActive : ""
              }`}
              onClick={() => toggleArticulation(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.title}>Ornements</p>
        <div className={styles.grid}>
          {ORNAMENTS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`${styles.button} ${styles.buttonSmall} ${
                activeOrnaments.includes(item.value) ? styles.buttonActive : ""
              }`}
              onClick={() => toggleOrnament(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {showGuitar && (
        <section className={styles.section}>
          <p className={styles.title}>Effets guitare</p>
          <div className={styles.grid}>
            {GUITAR_EFFECTS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${styles.button} ${styles.buttonSmall} ${
                  activeEffects.includes(item.value) ? styles.buttonActive : ""
                }`}
                onClick={() => toggleEffect(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className={styles.label}>
            Fret actif
            <input
              type="number"
              min={0}
              max={24}
              value={activeFret}
              onChange={(event) => setActiveFret(Number(event.target.value))}
            />
          </label>
        </section>
      )}

      <section className={styles.section}>
        <p className={styles.title}>Accords</p>
        <div className={styles.row}>
          <input
            type="text"
            placeholder="Cmaj7"
            value={chordInput}
            onChange={(event) => setChordInput(event.target.value)}
          />
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSmall}`}
            onClick={() => {
              addChordSymbol(caretTick, chordInput.trim());
              setChordInput("");
            }}
          >
            Ajouter
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.title}>Gamme</p>
        <div className={styles.row}>
          <select value={activeScaleId ?? ""} onChange={(event) => setScale(event.target.value || null)}>
            <option value="">Aucune</option>
            {SCALES.map((scale) => (
              <option key={scale.id} value={scale.id}>
                {scale.name}
              </option>
            ))}
          </select>
          <select value={scaleRootMidi} onChange={(event) => setScaleRoot(Number(event.target.value))}>
            {SCALE_ROOTS.map((root) => (
              <option key={root.label} value={root.midi}>
                {root.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.title}>Piste</p>
        <div className={styles.row}>
          <select value={track.instrumentId ?? "generic"} disabled>
            {INSTRUMENTS.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>
        </div>
      </section>
    </aside>
  );
};
