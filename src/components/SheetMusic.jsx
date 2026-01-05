import { useEffect, useMemo, useState } from "react";
import {
  TUPLET_PRESETS,
  computeEffectiveDuration,
  formatDurationLabel,
  toDurationTicks,
} from "../utils/rhythm.js";

const DURATION_OPTIONS = [
  { value: "1/1", label: "Ronde" },
  { value: "1/2", label: "Blanche" },
  { value: "1/4", label: "Noire" },
  { value: "1/8", label: "Croche" },
  { value: "1/16", label: "Double croche" },
  { value: "1/32", label: "Triple croche" },
];

const INITIAL_NOTES = [
  {
    id: "n1",
    string: 1,
    fret: 3,
    pitch: "G4",
    baseDuration: "1/4",
    isDotted: false,
    tuplet: null,
    isRest: false,
    x: 120,
    y: 78,
  },
  {
    id: "n2",
    string: 2,
    fret: 1,
    pitch: "C4",
    baseDuration: "1/8",
    isDotted: false,
    tuplet: { n: 3, inTimeOf: 2 },
    isRest: false,
    x: 220,
    y: 92,
  },
  {
    id: "n3",
    string: 3,
    fret: 0,
    pitch: "G3",
    baseDuration: "1/8",
    isDotted: true,
    tuplet: null,
    isRest: false,
    x: 300,
    y: 104,
  },
  {
    id: "n4",
    string: 4,
    fret: 2,
    pitch: "E3",
    baseDuration: "1/4",
    isDotted: false,
    tuplet: null,
    isRest: false,
    x: 380,
    y: 118,
  },
];

const STAFF_LINES = [0, 1, 2, 3, 4];
const TAB_LINES = [0, 1, 2, 3, 4, 5];
const DEFAULT_DURATION = "1/4";

const getTupletLabel = (tuplet) =>
  tuplet ? `${tuplet.n} dans ${tuplet.inTimeOf}` : "-";

const getRhythmDebugLabel = ({ baseDuration, isDotted, tuplet }) => {
  const parts = [baseDuration ?? DEFAULT_DURATION];
  if (isDotted) {
    parts.push("point");
  }
  if (tuplet) {
    parts.push(`${tuplet.n}:${tuplet.inTimeOf}`);
  }
  return parts.join(" • ");
};

const getTabStringFromY = (y) => {
  const tabTop = 140;
  const lineSpacing = 10;
  const relativeY = Math.max(0, y - tabTop);
  const index = Math.round(relativeY / lineSpacing);
  const clampedIndex = Math.min(Math.max(index, 0), 5);
  return 6 - clampedIndex;
};

const SheetMusic = () => {
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [hoverNoteId, setHoverNoteId] = useState(null);
  const [lastUsedDuration, setLastUsedDuration] = useState(DEFAULT_DURATION);
  const [rhythmState, setRhythmState] = useState({
    baseDuration: null,
    isRest: false,
    isDotted: false,
    tuplet: null,
  });

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? notes[0],
    [activeNoteId, notes]
  );

  useEffect(() => {
    if (!activeNoteId) {
      return;
    }

    setNotes((prev) =>
      prev.map((note) =>
        note.id === activeNoteId
          ? {
              ...note,
              baseDuration: rhythmState.baseDuration ?? note.baseDuration,
              isRest: rhythmState.isRest,
              isDotted: rhythmState.isDotted,
              tuplet: rhythmState.tuplet,
            }
          : note
      )
    );
  }, [activeNoteId, rhythmState]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          event.target.tagName === "INPUT" ||
          event.target.tagName === "TEXTAREA")
      ) {
        return;
      }

      if (event.key >= "1" && event.key <= "6") {
        const index = Number(event.key) - 1;
        const duration = DURATION_OPTIONS[index]?.value;
        if (duration) {
          event.preventDefault();
          handleDurationSelect(duration);
        }
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        handleRestToggle();
        return;
      }

      if (event.key === ".") {
        event.preventDefault();
        setRhythmState((prev) => ({ ...prev, isDotted: !prev.isDotted }));
        return;
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        const presets = TUPLET_PRESETS;
        const currentIndex = presets.findIndex(
          (preset) =>
            preset.n === rhythmState.tuplet?.n &&
            preset.inTimeOf === rhythmState.tuplet?.inTimeOf
        );
        const nextIndex = currentIndex + 1;
        const nextTuplet = presets[nextIndex] ?? null;
        setRhythmState((prev) => ({ ...prev, tuplet: nextTuplet }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rhythmState.tuplet]);

  const handleNoteSelect = (note) => {
    setActiveNoteId(note.id);
    setRhythmState({
      baseDuration: note.baseDuration,
      isRest: note.isRest,
      isDotted: note.isDotted,
      tuplet: note.tuplet,
    });
    setLastUsedDuration(note.baseDuration ?? lastUsedDuration);
  };

  const handleDurationSelect = (duration) => {
    setRhythmState((prev) => ({ ...prev, baseDuration: duration }));
    setLastUsedDuration(duration);
  };

  const handleRestToggle = () => {
    setRhythmState((prev) => {
      const baseDuration = prev.baseDuration ?? lastUsedDuration ?? DEFAULT_DURATION;
      if (!prev.baseDuration) {
        setLastUsedDuration(baseDuration);
      }
      return {
        ...prev,
        baseDuration,
        isRest: !prev.isRest,
      };
    });
  };

  const handleTupletToggle = (tuplet) => {
    setRhythmState((prev) => {
      const isSame =
        prev.tuplet?.n === tuplet?.n &&
        prev.tuplet?.inTimeOf === tuplet?.inTimeOf;
      return { ...prev, tuplet: isSame ? null : tuplet };
    });
  };

  const handleSvgClick = (event) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 520;
    const y = ((event.clientY - rect.top) / rect.height) * 260;

    const baseDuration = rhythmState.baseDuration ?? lastUsedDuration ?? DEFAULT_DURATION;
    const newNote = {
      id: `n${Date.now()}`,
      string: getTabStringFromY(y),
      fret: 0,
      pitch: "E4",
      baseDuration,
      isDotted: rhythmState.isDotted,
      tuplet: rhythmState.tuplet,
      isRest: rhythmState.isRest,
      x,
      y,
    };

    setNotes((prev) => [...prev, newNote]);
    setActiveNoteId(newNote.id);
    setLastUsedDuration(baseDuration);
  };

  const currentEffectiveDuration = useMemo(() => {
    const baseDuration = rhythmState.baseDuration ?? lastUsedDuration ?? DEFAULT_DURATION;
    return computeEffectiveDuration(
      baseDuration,
      rhythmState.isDotted,
      rhythmState.tuplet
    );
  }, [lastUsedDuration, rhythmState]);

  const currentTicks = useMemo(() => {
    const baseDuration = rhythmState.baseDuration ?? lastUsedDuration ?? DEFAULT_DURATION;
    return toDurationTicks(baseDuration, rhythmState.isDotted, rhythmState.tuplet);
  }, [lastUsedDuration, rhythmState]);

  return (
    <div className="sheet">
      <div className="sheet__canvas">
        <div className="rhythm">
          <div className="rhythm__row">
            {DURATION_OPTIONS.map((duration) => (
              <button
                key={duration.value}
                type="button"
                className={`rhythm__button ${
                  rhythmState.baseDuration === duration.value ? "is-active" : ""
                }`}
                aria-pressed={rhythmState.baseDuration === duration.value}
                onClick={() => handleDurationSelect(duration.value)}
              >
                <span className="rhythm__value">{duration.value}</span>
                <span className="rhythm__label">{duration.label}</span>
              </button>
            ))}
            <button
              type="button"
              className={`rhythm__button rhythm__button--rest ${
                rhythmState.isRest ? "is-active" : ""
              }`}
              aria-pressed={rhythmState.isRest}
              onClick={handleRestToggle}
            >
              Silence
            </button>
            <button
              type="button"
              className={`rhythm__button ${rhythmState.isDotted ? "is-active" : ""}`}
              aria-pressed={rhythmState.isDotted}
              onClick={() =>
                setRhythmState((prev) => ({ ...prev, isDotted: !prev.isDotted }))
              }
            >
              Point
            </button>
            {TUPLET_PRESETS.map((tuplet) => (
              <button
                key={tuplet.n}
                type="button"
                className={`rhythm__button ${
                  rhythmState.tuplet?.n === tuplet.n ? "is-active" : ""
                }`}
                aria-pressed={rhythmState.tuplet?.n === tuplet.n}
                onClick={() => handleTupletToggle({ n: tuplet.n, inTimeOf: tuplet.inTimeOf })}
              >
                {tuplet.n}
              </button>
            ))}
          </div>
          <div className="rhythm__meta">
            <span>Durée courante: {getRhythmDebugLabel(rhythmState)}</span>
            <span>
              Effectif: {currentEffectiveDuration.num}/{currentEffectiveDuration.den} • {currentTicks} ticks
            </span>
          </div>
        </div>
        <svg
          viewBox="0 0 520 260"
          role="img"
          aria-labelledby="sheet-title"
          onClick={handleSvgClick}
        >
          <title id="sheet-title">Partition et tablature</title>
          <rect x="20" y="24" width="480" height="200" rx="16" />

          <g className="staff" transform="translate(60, 60)">
            {STAFF_LINES.map((line) => (
              <line
                key={`staff-${line}`}
                x1="0"
                y1={line * 12}
                x2="400"
                y2={line * 12}
              />
            ))}
            <text x="-28" y="10" className="label">
              Sol
            </text>
          </g>

          <g className="tab" transform="translate(60, 140)">
            {TAB_LINES.map((line) => (
              <line
                key={`tab-${line}`}
                x1="0"
                y1={line * 10}
                x2="400"
                y2={line * 10}
              />
            ))}
            <text x="-30" y="18" className="label">
              TAB
            </text>
          </g>

          {notes.map((note) => {
            const isActive = activeNote?.id === note.id;
            const isHover = hoverNoteId === note.id;
            if (note.isRest) {
              return (
                <g
                  key={note.id}
                  className={`rest ${isActive ? "is-active" : ""} ${
                    isHover ? "is-hover" : ""
                  }`}
                  transform={`translate(${note.x}, ${note.y})`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNoteSelect(note);
                  }}
                  onMouseEnter={() => setHoverNoteId(note.id)}
                  onMouseLeave={() => setHoverNoteId(null)}
                >
                  <rect x="-10" y="-6" width="20" height="12" rx="4" />
                  <text x="-12" y="26" className="tab-fret">
                    R
                  </text>
                </g>
              );
            }

            return (
              <g
                key={note.id}
                className={`note ${isActive ? "is-active" : ""} ${
                  isHover ? "is-hover" : ""
                }`}
                transform={`translate(${note.x}, ${note.y})`}
                onClick={(event) => {
                  event.stopPropagation();
                  handleNoteSelect(note);
                }}
                onMouseEnter={() => setHoverNoteId(note.id)}
                onMouseLeave={() => setHoverNoteId(null)}
              >
                <circle cx="0" cy="0" r="8" />
                <line x1="8" y1="0" x2="8" y2="-26" />
                <text x="-4" y="48" className="tab-fret">
                  {note.fret}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <aside className="sheet__panel">
        <h2>Note sélectionnée</h2>
        <div className="panel__details">
          <div>
            <span className="panel__label">Type</span>
            <strong>{activeNote.isRest ? "Silence" : "Note"}</strong>
          </div>
          <div>
            <span className="panel__label">Corde</span>
            <strong>{activeNote.string ?? "-"}</strong>
          </div>
          <div>
            <span className="panel__label">Case</span>
            <strong>{activeNote.fret ?? "-"}</strong>
          </div>
          <div>
            <span className="panel__label">Hauteur</span>
            <strong>{activeNote.pitch ?? "-"}</strong>
          </div>
          <div>
            <span className="panel__label">Durée</span>
            <strong>
              {formatDurationLabel(
                activeNote.baseDuration,
                activeNote.isDotted,
                activeNote.tuplet
              )}
            </strong>
          </div>
          <div>
            <span className="panel__label">Tuplet</span>
            <strong>{getTupletLabel(activeNote.tuplet)}</strong>
          </div>
        </div>
        <p className="panel__hint">
          Astuce : utilisez 1-6, R, ., T pour contrôler la palette de rythme.
        </p>
      </aside>
    </div>
  );
};

export default SheetMusic;
