import { useEffect, useMemo, useState } from "react";
import type { BaseDuration, RhythmEvent, RhythmState, TimeSignature } from "../utils/types";
import {
  TUPLET_PRESETS,
  computeEffectiveDuration,
  formatDurationLabel,
  toDurationTicks,
} from "../utils/rhythm";
import { computeLayout, type LayoutEvent, type BeamGroup } from "../utils/layout";

const DURATION_OPTIONS: { value: BaseDuration; label: string }[] = [
  { value: "1/1", label: "Ronde" },
  { value: "1/2", label: "Blanche" },
  { value: "1/4", label: "Noire" },
  { value: "1/8", label: "Croche" },
  { value: "1/16", label: "Double croche" },
  { value: "1/32", label: "Triple croche" },
];

const TIME_SIGNATURE: TimeSignature = { beats: 4, beatUnit: 4 };
const TICKS_PER_WHOLE = 1024;
const DEFAULT_DURATION: BaseDuration = "1/4";

const INITIAL_EVENTS: RhythmEvent[] = [
  {
    id: "n1",
    string: 1,
    fret: 3,
    pitch: "G4",
    baseDuration: "1/4",
    dotted: false,
    tuplet: null,
    isRest: false,
  },
  {
    id: "n2",
    string: 2,
    fret: 1,
    pitch: "C4",
    baseDuration: "1/8",
    dotted: false,
    tuplet: null,
    isRest: false,
  },
  {
    id: "n3",
    string: 2,
    fret: 1,
    pitch: "C4",
    baseDuration: "1/16",
    dotted: false,
    tuplet: null,
    isRest: false,
  },
  {
    id: "r1",
    baseDuration: "1/8",
    dotted: false,
    tuplet: null,
    isRest: true,
  },
  {
    id: "n4",
    string: 3,
    fret: 0,
    pitch: "G3",
    baseDuration: "1/8",
    dotted: true,
    tuplet: null,
    isRest: false,
  },
  {
    id: "n5",
    string: 4,
    fret: 2,
    pitch: "E3",
    baseDuration: "1/4",
    dotted: false,
    tuplet: null,
    isRest: false,
  },
  {
    id: "n6",
    string: 1,
    fret: 5,
    pitch: "A4",
    baseDuration: "1/8",
    dotted: false,
    tuplet: { n: 3, inTimeOf: 2 },
    isRest: false,
  },
  {
    id: "n7",
    string: 1,
    fret: 7,
    pitch: "B4",
    baseDuration: "1/8",
    dotted: false,
    tuplet: { n: 3, inTimeOf: 2 },
    isRest: false,
  },
  {
    id: "n8",
    string: 1,
    fret: 8,
    pitch: "C5",
    baseDuration: "1/8",
    dotted: false,
    tuplet: { n: 3, inTimeOf: 2 },
    isRest: false,
  },
];

const getTupletLabel = (tuplet: RhythmState["tuplet"]) =>
  tuplet ? `${tuplet.n} dans ${tuplet.inTimeOf}` : "-";

const getRhythmDebugLabel = ({ baseDuration, dotted, tuplet }: RhythmState) => {
  const parts = [baseDuration ?? DEFAULT_DURATION];
  if (dotted) {
    parts.push("point");
  }
  if (tuplet) {
    parts.push(`${tuplet.n}:${tuplet.inTimeOf}`);
  }
  return parts.join(" • ");
};

const buildRestPath = (baseDuration: BaseDuration) => {
  switch (baseDuration) {
    case "1/1":
      return "M -6 0 H 6 V 6 H -6 Z";
    case "1/2":
      return "M -6 0 H 6 V -6 H -6 Z";
    default:
      return "M 0 -10 L -4 -2 L 4 4 L -2 12";
  }
};

const renderFlags = (
  x: number,
  y: number,
  direction: "up" | "down",
  count: number
) => {
  const spacing = 6;
  return Array.from({ length: count }, (_, index) => {
    const offset = index * spacing * (direction === "up" ? 1 : -1);
    const flagY = y + offset;
    const path =
      direction === "up"
        ? `M ${x} ${flagY} Q ${x + 8} ${flagY + 4} ${x + 6} ${flagY + 12}`
        : `M ${x} ${flagY} Q ${x - 8} ${flagY - 4} ${x - 6} ${flagY - 12}`;
    return <path key={`flag-${index}`} d={path} className="flag" />;
  });
};

const renderRestFlags = (
  x: number,
  y: number,
  direction: "up" | "down",
  count: number
) => {
  if (count <= 0) {
    return null;
  }
  const spacing = 6;
  return Array.from({ length: count }, (_, index) => {
    const offset = index * spacing * (direction === "up" ? 1 : -1);
    return (
      <path
        key={`rest-flag-${index}`}
        d={`M ${x} ${y + offset} q ${direction === "up" ? 8 : -8} ${
          direction === "up" ? 4 : -4
        } ${direction === "up" ? 4 : -4} ${direction === "up" ? 12 : -12}`}
        className="rest-flag"
      />
    );
  });
};

const getStemEnd = (event: LayoutEvent) => {
  return event.stemDirection === "up"
    ? event.staffY - event.stemLength
    : event.staffY + event.stemLength;
};

const getTabStemEnd = (event: LayoutEvent) => {
  return event.stemDirection === "up"
    ? event.tabY - event.stemLength
    : event.tabY + event.stemLength;
};

const SheetMusic = () => {
  const [events, setEvents] = useState<RhythmEvent[]>(INITIAL_EVENTS);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [hoverEventId, setHoverEventId] = useState<string | null>(null);
  const [lastUsedDuration, setLastUsedDuration] = useState<BaseDuration>(
    DEFAULT_DURATION
  );
  const [rhythmState, setRhythmState] = useState<RhythmState>({
    baseDuration: DEFAULT_DURATION,
    dotted: false,
    tuplet: null,
    isRest: false,
  });
  const [debugEnabled] = useState(true);

  const layout = useMemo(
    () =>
      computeLayout(events, {
        timeSignature: TIME_SIGNATURE,
        ticksPerWhole: TICKS_PER_WHOLE,
        xStart: 80,
        measureWidth: 200,
        staffTop: 60,
        staffLineSpacing: 12,
        tabTop: 170,
        tabLineSpacing: 10,
        stemLength: 30,
      }),
    [events]
  );

  const measureCount = Math.max(
    2,
    Math.ceil(layout.totalTicks / layout.measureTicks)
  );
  const staffWidth = measureCount * 200;

  const activeEvent = useMemo(
    () => events.find((note) => note.id === activeEventId) ?? events[0],
    [activeEventId, events]
  );

  if (!activeEvent) {
    return null;
  }

  const handleEventSelect = (event: RhythmEvent) => {
    setActiveEventId(event.id);
    setRhythmState({
      baseDuration: event.baseDuration,
      dotted: event.dotted,
      tuplet: event.tuplet,
      isRest: event.isRest,
    });
    setLastUsedDuration(event.baseDuration ?? lastUsedDuration);
  };

  const applyRhythmToEvent = (eventId: string, next: RhythmState) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              baseDuration: next.baseDuration,
              isRest: next.isRest,
              dotted: next.dotted,
              tuplet: next.tuplet,
            }
          : event
      )
    );
  };

  const updateRhythmState = (update: Partial<RhythmState>) => {
    setRhythmState((prev) => {
      const next = { ...prev, ...update } as RhythmState;
      if (activeEventId) {
        applyRhythmToEvent(activeEventId, next);
      }
      return next;
    });
  };

  const handleDurationSelect = (duration: BaseDuration) => {
    updateRhythmState({ baseDuration: duration });
    setLastUsedDuration(duration);
  };

  const handleRestToggle = () => {
    updateRhythmState({ isRest: !rhythmState.isRest });
  };

  const handleTupletToggle = (tuplet: RhythmState["tuplet"]) => {
    const isSame =
      rhythmState.tuplet?.n === tuplet?.n &&
      rhythmState.tuplet?.inTimeOf === tuplet?.inTimeOf;
    updateRhythmState({ tuplet: isSame ? null : tuplet });
  };

  const handleSlotInsert = (slotTick: number) => {
    const newEvent: RhythmEvent = {
      id: `event-${Date.now()}`,
      string: 1,
      fret: 0,
      pitch: "E4",
      baseDuration: rhythmState.baseDuration ?? lastUsedDuration,
      dotted: rhythmState.dotted,
      tuplet: rhythmState.tuplet,
      isRest: rhythmState.isRest,
    };

    setEvents((prev) => {
      const layoutEvents = computeLayout(prev, {
        timeSignature: TIME_SIGNATURE,
        ticksPerWhole: TICKS_PER_WHOLE,
        xStart: 80,
        measureWidth: 200,
        staffTop: 60,
        staffLineSpacing: 12,
        tabTop: 170,
        tabLineSpacing: 10,
        stemLength: 30,
      }).events;
      const insertionIndex = layoutEvents.findIndex(
        (event) => event.startTick > slotTick
      );
      const next = [...prev];
      if (insertionIndex === -1) {
        next.push(newEvent);
      } else {
        next.splice(insertionIndex, 0, newEvent);
      }
      return next;
    });
    setActiveEventId(newEvent.id);
  };

  const currentEffectiveDuration = useMemo(() => {
    const baseDuration = rhythmState.baseDuration ?? lastUsedDuration;
    return computeEffectiveDuration(baseDuration, rhythmState.dotted, rhythmState.tuplet);
  }, [lastUsedDuration, rhythmState]);

  const currentTicks = useMemo(() => {
    const baseDuration = rhythmState.baseDuration ?? lastUsedDuration;
    return toDurationTicks(
      baseDuration,
      rhythmState.dotted,
      rhythmState.tuplet,
      TICKS_PER_WHOLE
    );
  }, [lastUsedDuration, rhythmState]);

  const slots = useMemo(() => {
    const slotsPerMeasure = TIME_SIGNATURE.beats;
    return Array.from({ length: measureCount * slotsPerMeasure }, (_, index) => {
      const tick = index * layout.ticksPerBeat;
      const x = 80 + (tick / layout.measureTicks) * 200;
      return {
        id: `slot-${index}`,
        tick,
        x,
        width: 200 / slotsPerMeasure,
      };
    });
  }, [layout.measureTicks, layout.ticksPerBeat, measureCount]);

  const renderBeamSegments = (
    beamGroups: BeamGroup[],
    eventsById: Record<string, LayoutEvent>,
    type: "staff" | "tab"
  ) => {
    return beamGroups.flatMap((group) =>
      group.segments.map((segment) => {
        const firstEvent = eventsById[group.eventIds[0]];
        if (!firstEvent) {
          return null;
        }
        const baseY =
          type === "staff" ? segment.y : getTabStemEnd(firstEvent);
        const offset =
          type === "staff"
            ? 0
            : firstEvent.stemDirection === "up"
              ? -(segment.level - 1) * 6
              : (segment.level - 1) * 6;
        return (
          <line
            key={`${group.id}-${type}-${segment.level}-${segment.xStart}`}
            x1={segment.xStart}
            y1={baseY + offset}
            x2={segment.xEnd}
            y2={baseY + offset}
            className="beam"
          />
        );
      })
    );
  };

  const eventsById = useMemo(() => {
    return layout.events.reduce<Record<string, LayoutEvent>>((acc, event) => {
      acc[event.id] = event;
      return acc;
    }, {});
  }, [layout.events]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
        updateRhythmState({ dotted: !rhythmState.dotted });
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
        updateRhythmState({ tuplet: nextTuplet });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rhythmState.dotted, rhythmState.tuplet]);

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
              className={`rhythm__button ${rhythmState.dotted ? "is-active" : ""}`}
              aria-pressed={rhythmState.dotted}
              onClick={() => updateRhythmState({ dotted: !rhythmState.dotted })}
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
        <svg viewBox="0 0 640 320" role="img" aria-labelledby="sheet-title">
          <title id="sheet-title">Partition et tablature</title>
          <rect x="20" y="24" width="600" height="250" rx="16" />

          <g className="measure-lines">
            {Array.from({ length: measureCount + 1 }, (_, index) => (
              <line
                key={`measure-${index}`}
                x1={80 + index * 200}
                y1={50}
                x2={80 + index * 200}
                y2={240}
              />
            ))}
          </g>

          <g className="staff">
            {Array.from({ length: 5 }, (_, line) => (
              <line
                key={`staff-${line}`}
                x1={80}
                y1={60 + line * 12}
                x2={80 + staffWidth}
                y2={60 + line * 12}
              />
            ))}
            <text x={46} y={72} className="label">
              Sol
            </text>
          </g>

          <g className="tab">
            {Array.from({ length: 6 }, (_, line) => (
              <line
                key={`tab-${line}`}
                x1={80}
                y1={170 + line * 10}
                x2={80 + staffWidth}
                y2={170 + line * 10}
              />
            ))}
            <text x={42} y={188} className="label">
              TAB
            </text>
          </g>

          <g className="slots">
            {slots.map((slot) => (
              <rect
                key={slot.id}
                x={slot.x - slot.width / 2}
                y={50}
                width={slot.width}
                height={190}
                className="slot"
                onClick={(event) => {
                  event.stopPropagation();
                  handleSlotInsert(slot.tick);
                }}
              />
            ))}
          </g>

          <g className="beams beams--staff">
            {renderBeamSegments(layout.beamGroups, eventsById, "staff")}
          </g>

          <g className="beams beams--tab">
            {renderBeamSegments(layout.beamGroups, eventsById, "tab")}
          </g>

          <g className="tuplets">
            {layout.tupletBrackets.map((bracket) => (
              <g key={bracket.id} className="tuplet">
                <line x1={bracket.startX} y1={bracket.y} x2={bracket.endX} y2={bracket.y} />
                <text x={(bracket.startX + bracket.endX) / 2} y={bracket.y - 6}>
                  {bracket.label}
                </text>
              </g>
            ))}
          </g>

          {layout.events.map((event) => {
            const isActive = activeEventId === event.id;
            const isHover = hoverEventId === event.id;
            const baseEventId = event.id;

            if (event.isRest) {
              return (
                <g
                  key={event.id}
                  className={`rest ${isActive ? "is-active" : ""} ${
                    isHover ? "is-hover" : ""
                  }`}
                  data-id={baseEventId}
                  onClick={(eventClick) => {
                    eventClick.stopPropagation();
                    const original = events.find((item) => item.id === baseEventId);
                    if (original) {
                      handleEventSelect(original);
                    }
                  }}
                  onMouseEnter={() => setHoverEventId(baseEventId)}
                  onMouseLeave={() => setHoverEventId(null)}
                >
                  <path
                    d={buildRestPath(
                      events.find((item) => item.id === baseEventId)?.baseDuration ??
                        DEFAULT_DURATION
                    )}
                    transform={`translate(${event.x}, ${event.staffY})`}
                    className="rest-body"
                  />
                  {renderRestFlags(
                    event.x,
                    event.staffY - 10,
                    event.stemDirection,
                    event.flags
                  )}
                  <text x={event.x} y={event.tabY} className="tab-rest">
                    R
                  </text>
                </g>
              );
            }

            const stemEnd = getStemEnd(event);
            const tabStemEnd = getTabStemEnd(event);
            const shouldRenderFlags = !event.beamed && event.flags > 0;

            return (
              <g
                key={event.id}
                className={`note ${isActive ? "is-active" : ""} ${
                  isHover ? "is-hover" : ""
                }`}
                  data-id={baseEventId}
                onClick={(eventClick) => {
                  eventClick.stopPropagation();
                    const original = events.find((item) => item.id === baseEventId);
                  if (original) {
                    handleEventSelect(original);
                  }
                }}
                onMouseEnter={() => setHoverEventId(baseEventId)}
                onMouseLeave={() => setHoverEventId(null)}
              >
                <ellipse cx={event.x} cy={event.staffY} rx={9} ry={6} className="notehead" />
                <line
                  x1={event.x + (event.stemDirection === "up" ? 8 : -8)}
                  y1={event.staffY}
                  x2={event.x + (event.stemDirection === "up" ? 8 : -8)}
                  y2={stemEnd}
                  className="stem"
                />
                {shouldRenderFlags &&
                  renderFlags(
                    event.x + (event.stemDirection === "up" ? 8 : -8),
                    stemEnd,
                    event.stemDirection,
                    event.flags
                  )}

                <text x={event.x} y={event.tabY + 4} className="tab-fret">
                  {event.fret ?? 0}
                </text>
                <line
                  x1={event.x + (event.stemDirection === "up" ? 8 : -8)}
                  y1={event.tabY}
                  x2={event.x + (event.stemDirection === "up" ? 8 : -8)}
                  y2={tabStemEnd}
                  className="stem tab-stem"
                />
                {shouldRenderFlags &&
                  renderFlags(
                    event.x + (event.stemDirection === "up" ? 8 : -8),
                    tabStemEnd,
                    event.stemDirection,
                    event.flags
                  )}

                {debugEnabled && (
                  <text x={event.x} y={event.staffY - 36} className="debug-label">
                    {event.startTick}
                  </text>
                )}
              </g>
            );
          })}

          {debugEnabled && (
            <g className="debug">
              <text x={80} y={40}>
                {TIME_SIGNATURE.beats}/{TIME_SIGNATURE.beatUnit} • largeur mesure 200
              </text>
              {layout.beamGroups.map((group) => {
                const groupEvents = group.eventIds
                  .map((id) => eventsById[id])
                  .filter(Boolean);
                if (groupEvents.length === 0) {
                  return null;
                }
                const minX = Math.min(...groupEvents.map((item) => item.x)) - 12;
                const maxX = Math.max(...groupEvents.map((item) => item.x)) + 12;
                const minY = Math.min(...groupEvents.map((item) => item.staffY)) - 46;
                return (
                  <rect
                    key={`debug-group-${group.id}`}
                    x={minX}
                    y={minY}
                    width={maxX - minX}
                    height={60}
                    className="debug-group"
                  />
                );
              })}
            </g>
          )}
        </svg>
      </div>
      <aside className="sheet__panel">
        <h2>Note sélectionnée</h2>
        <div className="panel__details">
          <div>
            <span className="panel__label">Type</span>
            <strong>{activeEvent.isRest ? "Silence" : "Note"}</strong>
          </div>
          <div>
            <span className="panel__label">Corde</span>
            <strong>{activeEvent.string ?? "-"}</strong>
          </div>
          <div>
            <span className="panel__label">Case</span>
            <strong>{activeEvent.fret ?? "-"}</strong>
          </div>
          <div>
            <span className="panel__label">Hauteur</span>
            <strong>{activeEvent.pitch ?? "-"}</strong>
          </div>
          <div>
            <span className="panel__label">Durée</span>
            <strong>
              {formatDurationLabel(
                activeEvent.baseDuration,
                activeEvent.dotted,
                activeEvent.tuplet
              )}
            </strong>
          </div>
          <div>
            <span className="panel__label">Tuplet</span>
            <strong>{getTupletLabel(activeEvent.tuplet)}</strong>
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
