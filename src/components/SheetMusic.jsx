import { useMemo, useState } from "react";

const NOTES = [
  {
    id: "n1",
    string: 1,
    fret: 3,
    pitch: "G4",
    duration: "1/4",
    x: 120,
    y: 78,
  },
  {
    id: "n2",
    string: 2,
    fret: 1,
    pitch: "C4",
    duration: "1/8",
    x: 220,
    y: 92,
  },
  {
    id: "n3",
    string: 3,
    fret: 0,
    pitch: "G3",
    duration: "1/8",
    x: 300,
    y: 104,
  },
  {
    id: "n4",
    string: 4,
    fret: 2,
    pitch: "E3",
    duration: "1/4",
    x: 380,
    y: 118,
  },
];

const STAFF_LINES = [0, 1, 2, 3, 4];
const TAB_LINES = [0, 1, 2, 3, 4, 5];

const SheetMusic = () => {
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [hoverNoteId, setHoverNoteId] = useState(null);

  const activeNote = useMemo(
    () => NOTES.find((note) => note.id === activeNoteId) ?? NOTES[0],
    [activeNoteId]
  );

  return (
    <div className="sheet">
      <div className="sheet__canvas">
        <svg viewBox="0 0 520 260" role="img" aria-labelledby="sheet-title">
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

          {NOTES.map((note) => {
            const isActive = activeNote?.id === note.id;
            const isHover = hoverNoteId === note.id;
            return (
              <g
                key={note.id}
                className={`note ${isActive ? "is-active" : ""} ${
                  isHover ? "is-hover" : ""
                }`}
                transform={`translate(${note.x}, ${note.y})`}
                onClick={() => setActiveNoteId(note.id)}
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
            <span className="panel__label">Corde</span>
            <strong>{activeNote.string}</strong>
          </div>
          <div>
            <span className="panel__label">Case</span>
            <strong>{activeNote.fret}</strong>
          </div>
          <div>
            <span className="panel__label">Hauteur</span>
            <strong>{activeNote.pitch}</strong>
          </div>
          <div>
            <span className="panel__label">Durée</span>
            <strong>{activeNote.duration}</strong>
          </div>
        </div>
        <p className="panel__hint">
          Astuce : survolez la partition pour mettre en évidence la note active.
        </p>
      </aside>
    </div>
  );
};

export default SheetMusic;
