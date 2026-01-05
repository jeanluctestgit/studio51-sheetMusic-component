import { useMemo, useState } from "react";
import { useEditorStore } from "../editor/store";
import { INSTRUMENTS, getInstrumentById } from "../music/instruments";
import type { Articulation, Effect, KeySignature, Ornament, ToolId } from "../music/types";
import { SCALES } from "../music/scales";

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
    <aside className="toolbar">
      <section className="toolbar__section">
        <p className="toolbar__title">Outils</p>
        <div className="toolbar__grid">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`toolbar__button ${activeTool === tool.id ? "is-active" : ""}`}
              onClick={() => setTool(tool.id)}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </section>

      <section className="toolbar__section">
        <p className="toolbar__title">Durée</p>
        <div className="toolbar__grid">
          {DURATIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`toolbar__button ${duration === item.value ? "is-active" : ""}`}
              onClick={() => setDuration(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="toolbar__grid">
          <button
            type="button"
            className={`toolbar__button toolbar__button--small ${dotted ? "is-active" : ""}`}
            onClick={toggleDotted}
          >
            Pointé
          </button>
          <button
            type="button"
            className={`toolbar__button toolbar__button--small ${triplet ? "is-active" : ""}`}
            onClick={toggleTriplet}
          >
            Triolet
          </button>
        </div>
      </section>

      <section className="toolbar__section">
        <p className="toolbar__title">Signature</p>
        <div className="toolbar__row">
          <label className="toolbar__label">
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
          <label className="toolbar__label">
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

      <section className="toolbar__section">
        <p className="toolbar__title">Articulations</p>
        <div className="toolbar__grid">
          {ARTICULATIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`toolbar__button toolbar__button--small ${
                activeArticulations.includes(item.value) ? "is-active" : ""
              }`}
              onClick={() => toggleArticulation(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="toolbar__section">
        <p className="toolbar__title">Ornements</p>
        <div className="toolbar__grid">
          {ORNAMENTS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`toolbar__button toolbar__button--small ${
                activeOrnaments.includes(item.value) ? "is-active" : ""
              }`}
              onClick={() => toggleOrnament(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {showGuitar && (
        <section className="toolbar__section">
          <p className="toolbar__title">Effets guitare</p>
          <div className="toolbar__grid">
            {GUITAR_EFFECTS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`toolbar__button toolbar__button--small ${
                  activeEffects.includes(item.value) ? "is-active" : ""
                }`}
                onClick={() => toggleEffect(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="toolbar__section">
        <p className="toolbar__title">Accords</p>
        <div className="toolbar__row">
          <input
            type="text"
            placeholder="Cmaj7"
            value={chordInput}
            onChange={(event) => setChordInput(event.target.value)}
          />
          <button
            type="button"
            className="toolbar__button toolbar__button--small"
            onClick={() => {
              addChordSymbol(caretTick, chordInput.trim());
              setChordInput("");
            }}
          >
            Ajouter
          </button>
        </div>
      </section>

      <section className="toolbar__section">
        <p className="toolbar__title">Gamme</p>
        <div className="toolbar__row">
          <select
            value={activeScaleId ?? ""}
            onChange={(event) => setScale(event.target.value || null)}
          >
            <option value="">Aucune</option>
            {SCALES.map((scale) => (
              <option key={scale.id} value={scale.id}>
                {scale.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="toolbar__section">
        <p className="toolbar__title">Piste</p>
        <div className="toolbar__row">
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
