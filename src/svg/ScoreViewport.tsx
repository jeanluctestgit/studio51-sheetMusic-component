import { memo, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { useEditorStore } from "../state/editorStore";
import { DEFAULT_LAYOUT, createLayoutHelpers } from "../editor/layout";
import { TOOL_HANDLERS, type DragState, type SelectionBox, type ToolContext } from "../editor/tools";
import { getInstrumentById } from "../music/instruments";
import type { MusicalEvent, RestEvent, ScoreEvent } from "../music/types";
import { scalePitchClasses } from "../music/scales";
import { mapEventsToTabPositions } from "../music/mapping";
import styles from "../styles/ScoreViewport.module.css";

const NOTE_RADIUS = 6;
const STEM_HEIGHT = 34;

const isNote = (event: ScoreEvent): event is MusicalEvent => event.type === "note";
const isRest = (event: ScoreEvent): event is RestEvent => event.type === "rest";

interface BackgroundLayerProps {
  viewWidth: number;
  viewHeight: number;
  systemIndices: number[];
  staffLines: Map<number, number[]>;
  tabLines: Map<number, number[]>;
  measureBars: { x: number; systemIndex: number; measureIndex: number }[];
  showTab: boolean;
  title: string;
  keySignature: string;
  tempoBpm: number;
  timeSignature: { beats: number; beatUnit: number };
  clef: "treble" | "bass";
}

const BackgroundLayer = memo(
  ({
    viewWidth,
    viewHeight,
    systemIndices,
    staffLines,
    tabLines,
    measureBars,
    showTab,
    title,
    keySignature,
    tempoBpm,
    timeSignature,
    clef,
  }: BackgroundLayerProps) => (
    <g className="score-layer score-layer--background">
      <rect x={0} y={0} width={viewWidth} height={viewHeight} rx={16} />
      <text x={DEFAULT_LAYOUT.marginLeft} y={30} className="score-label">
        {title}
      </text>
      <text x={DEFAULT_LAYOUT.marginLeft} y={48} className="score-label score-label--meta">
        {keySignature} • {timeSignature.beats}/{timeSignature.beatUnit} • {tempoBpm} bpm
      </text>

      {systemIndices.map((systemIndex) => {
        const staff = staffLines.get(systemIndex) ?? [];
        const tabs = tabLines.get(systemIndex) ?? [];
        return (
          <g key={`system-${systemIndex}`}>
            {staff.map((y, index) => (
              <line key={`staff-${systemIndex}-${index}`} x1={DEFAULT_LAYOUT.marginLeft} y1={y} x2={viewWidth - 40} y2={y} />
            ))}
            {showTab &&
              tabs.map((y, index) => (
                <line key={`tab-${systemIndex}-${index}`} x1={DEFAULT_LAYOUT.marginLeft} y1={y} x2={viewWidth - 40} y2={y} />
              ))}
          </g>
        );
      })}

      {measureBars.map((bar, index) => (
        <line
          key={`bar-${bar.systemIndex}-${index}`}
          x1={bar.x}
          y1={(staffLines.get(bar.systemIndex) ?? [])[0] ?? DEFAULT_LAYOUT.staffTop}
          x2={bar.x}
          y2={(showTab ? (tabLines.get(bar.systemIndex) ?? []) : staffLines.get(bar.systemIndex) ?? []).slice(-1)[0] ??
            DEFAULT_LAYOUT.staffTop + 48}
          className="barline"
        />
      ))}

      {systemIndices.map((systemIndex) => {
        const staffTop = (staffLines.get(systemIndex) ?? [DEFAULT_LAYOUT.staffTop])[0] ?? DEFAULT_LAYOUT.staffTop;
        return (
          <g key={`signatures-${systemIndex}`}>
            <text x={DEFAULT_LAYOUT.marginLeft - 30} y={staffTop + 30} className="clef">
              {clef === "treble" ? "𝄞" : "𝄢"}
            </text>
            <text x={DEFAULT_LAYOUT.marginLeft - 10} y={staffTop + 10} className="signature">
              {keySignature}
            </text>
            <text x={DEFAULT_LAYOUT.marginLeft + 20} y={staffTop + 18} className="signature">
              {timeSignature.beats}
            </text>
            <text x={DEFAULT_LAYOUT.marginLeft + 20} y={staffTop + 38} className="signature">
              {timeSignature.beatUnit}
            </text>
          </g>
        );
      })}
    </g>
  )
);

BackgroundLayer.displayName = "BackgroundLayer";

interface NotesLayerProps {
  noteEvents: MusicalEvent[];
  restEvents: RestEvent[];
  chordEvents: ScoreEvent[];
  selectedEventIds: string[];
  tickToX: (tick: number) => number;
  pitchToY: (pitch: number, tick: number) => number;
  getStaffTop: (tick: number) => number;
  scalePitchClassesSet: Set<number> | null;
  ticksPerWhole: number;
}

const NotesLayer = memo(
  ({
    noteEvents,
    restEvents,
    chordEvents,
    selectedEventIds,
    tickToX,
    pitchToY,
    getStaffTop,
    scalePitchClassesSet,
    ticksPerWhole,
  }: NotesLayerProps) => {
    const beamGroups = noteEvents.reduce<MusicalEvent[][]>((groups, note) => {
      if (note.durationTicks > ticksPerWhole / 8) {
        groups.push([note]);
        return groups;
      }
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup) {
        groups.push([note]);
        return groups;
      }
      const lastNote = lastGroup[lastGroup.length - 1];
      if (lastNote && note.startTick - lastNote.startTick <= note.durationTicks) {
        lastGroup.push(note);
      } else {
        groups.push([note]);
      }
      return groups;
    }, []);

    return (
      <g className="score-layer score-layer--notes">
        {chordEvents.map((event) =>
          event.type === "chord" ? (
            <text
              key={event.id}
              x={tickToX(event.startTick)}
              y={getStaffTop(event.startTick) - 12}
              className="chord-symbol"
            >
              {event.symbol}
            </text>
          ) : null
        )}

        {restEvents.map((event) => {
          const x = tickToX(event.startTick);
          const restY = getStaffTop(event.startTick) + 10;
          return (
            <g key={event.id} data-event-id={event.id} className="rest">
              <rect x={x - 4} y={restY} width={8} height={8} rx={2} />
            </g>
          );
        })}

        {noteEvents.map((note) => {
          const x = tickToX(note.startTick);
          const pitch = note.pitches[0] ?? 60;
          const y = pitchToY(pitch, note.startTick);
          const isSelected = selectedEventIds.includes(note.id);
          const inScale = scalePitchClassesSet?.has(((pitch % 12) + 12) % 12);

          return (
            <g key={note.id} data-event-id={note.id} className={`note ${isSelected ? "is-selected" : ""}`}>
              <circle cx={x} cy={y} r={NOTE_RADIUS} className={`notehead ${inScale ? "notehead--scale" : ""}`} />
              <line x1={x + NOTE_RADIUS} y1={y} x2={x + NOTE_RADIUS} y2={y - STEM_HEIGHT} className="stem" />
              {note.articulations.includes("staccato") && <circle cx={x} cy={y - 20} r={2} className="ornament" />}
            </g>
          );
        })}

        {beamGroups.map((group, groupIndex) => {
          if (group.length < 2) {
            return null;
          }
          const points = group.map((note) => {
            const x = tickToX(note.startTick) + NOTE_RADIUS;
            const pitch = note.pitches[0] ?? 60;
            const y = pitchToY(pitch, note.startTick) - STEM_HEIGHT;
            return { x, y };
          });
          const first = points[0];
          const last = points[points.length - 1];
          return <line key={`beam-${groupIndex}`} x1={first.x} y1={first.y} x2={last.x} y2={last.y} className="beam" />;
        })}
      </g>
    );
  }
);

NotesLayer.displayName = "NotesLayer";

interface TabLayerProps {
  showTab: boolean;
  tabPositions: Map<string, { strings: number[]; frets: number[] }>;
  noteEvents: MusicalEvent[];
  tickToX: (tick: number) => number;
  getTabLinePosition: (systemIndex: number, stringIndex: number) => number | null;
  getSystemIndexForTick: (tick: number) => number;
}

const TabLayer = memo(
  ({ showTab, tabPositions, noteEvents, tickToX, getTabLinePosition, getSystemIndexForTick }: TabLayerProps) => {
    if (!showTab) {
      return null;
    }

    return (
      <g className="score-layer score-layer--tab">
        {noteEvents.map((note) => {
          const position = tabPositions.get(note.id);
          if (!position) {
            return null;
          }
          const x = tickToX(note.startTick);
          const systemIndex = getSystemIndexForTick(note.startTick);
          const y = getTabLinePosition(systemIndex, position.strings[0]);
          if (y == null) {
            return null;
          }
          return (
            <text key={`tab-${note.id}`} x={x - 4} y={y + 4} className="tab-number">
              {position.frets[0]}
            </text>
          );
        })}
      </g>
    );
  }
);

TabLayer.displayName = "TabLayer";

interface OverlayLayerProps {
  caretX: number;
  caretYTop: number;
  caretYBottom: number;
  playbackX: number | null;
  showTab: boolean;
  selectionBox: SelectionBox | null;
}

const OverlayLayer = memo(
  ({ caretX, caretYTop, caretYBottom, playbackX, showTab, selectionBox }: OverlayLayerProps) => (
    <g className="score-layer score-layer--overlay">
      <line x1={caretX} y1={caretYTop} x2={caretX} y2={caretYBottom} className="caret" />
      {playbackX !== null && (
        <line x1={playbackX} y1={caretYTop} x2={playbackX} y2={caretYBottom} className="playback-caret" />
      )}
      {selectionBox && (
        <rect
          x={Math.min(selectionBox.startX, selectionBox.endX)}
          y={Math.min(selectionBox.startY, selectionBox.endY)}
          width={Math.abs(selectionBox.endX - selectionBox.startX)}
          height={Math.abs(selectionBox.endY - selectionBox.startY)}
          className="selection-box"
        />
      )}
    </g>
  )
);

OverlayLayer.displayName = "OverlayLayer";

export const ScoreViewport = () => {
  const {
    score,
    selectedTrackId,
    caretTick,
    setCaretTick,
    activeTool,
    selectedEventIds,
    addNoteAt,
    addRestAt,
    setSelection,
    toggleSelection,
    removeEvent,
    updateEvent,
    duration,
    dotted,
    triplet,
    activeScaleId,
    scaleRootMidi,
    activeFret,
    playbackTick,
    isPlaying,
  } = useEditorStore();

  const track = score.tracks.find((item) => item.id === selectedTrackId) ?? score.tracks[0];
  const instrument = getInstrumentById(track.instrumentId);
  const helpers = useMemo(
    () =>
      createLayoutHelpers(DEFAULT_LAYOUT, score.timeSignature, score.ticksPerWhole, track.clef, {
        showTab: track.showTab,
        stringCount: instrument.strings?.length ?? 0,
      }),
    [score.timeSignature, score.ticksPerWhole, track.clef, track.showTab, instrument.id]
  );
  const measureCount = track.measures.length;
  const systemCount = Math.max(1, Math.ceil(measureCount / DEFAULT_LAYOUT.measuresPerSystem));
  const viewWidth = DEFAULT_LAYOUT.marginLeft + DEFAULT_LAYOUT.measureWidth * DEFAULT_LAYOUT.measuresPerSystem + 80;
  const viewHeight = helpers.systemTop(systemCount - 1) + helpers.systemHeight + 20;

  const allEvents = track.measures.flatMap((measure) => measure.voices[0]?.events ?? []);
  const noteEvents = allEvents.filter(isNote);
  const restEvents = allEvents.filter(isRest);
  const chordEvents = allEvents.filter((event) => event.type === "chord");

  const scalePitchClassesSet = useMemo(
    () => scalePitchClasses(scaleRootMidi, activeScaleId),
    [scaleRootMidi, activeScaleId]
  );

  const tabPositions = useMemo(() => {
    const ordered = [...noteEvents].sort((a, b) => a.startTick - b.startTick);
    return mapEventsToTabPositions(
      ordered.map((note) => ({
        id: note.id,
        pitches: note.pitches,
        startTick: note.startTick,
        performanceHints: note.performanceHints,
      })),
      instrument
    );
  }, [instrument, noteEvents]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const systemIndices = useMemo(() => Array.from({ length: systemCount }, (_, index) => index), [systemCount]);

  const staffLines = useMemo(() => {
    const map = new Map<number, number[]>();
    systemIndices.forEach((index) => {
      map.set(index, helpers.getStaffLinePositions(index));
    });
    return map;
  }, [helpers, systemIndices]);

  const tabLines = useMemo(() => {
    const map = new Map<number, number[]>();
    if (!track.showTab) {
      return map;
    }
    systemIndices.forEach((index) => {
      map.set(index, helpers.getTabLinePositions(index));
    });
    return map;
  }, [helpers, systemIndices, track.showTab]);

  const measureBars = useMemo(() => {
    return systemIndices.flatMap((index) =>
      helpers
        .getMeasureBars(index)
        .filter((bar) => bar.measureIndex <= measureCount)
        .map((bar) => ({ x: bar.x, systemIndex: index, measureIndex: bar.measureIndex }))
    );
  }, [helpers, systemIndices, measureCount]);

  const handlePointer = (event: PointerEvent<SVGSVGElement>, handler: (context: ToolContext) => void) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const position = helpers.hitTest(x, y);

    const target = event.target as Element | null;
    const eventId = target?.closest("[data-event-id]")?.getAttribute("data-event-id") ?? null;

    handler({
      event,
      pointer: { x, y },
      eventId,
      position,
      noteEvents,
      allEvents,
      dragState,
      selectionBox,
      setDragState,
      setSelectionBox,
      setSelection,
      toggleSelection,
      addNoteAt,
      addRestAt,
      removeEvent,
      updateEvent,
      setCaretTick,
      activeFret,
      instrument,
      helpers: {
        tickToX: helpers.tickToX,
        xToTick: helpers.xToTick,
        pitchToY: helpers.pitchToY,
        yToPitch: helpers.yToPitch,
      },
    });
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    handlePointer(event, TOOL_HANDLERS[activeTool].onPointerDown);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    handlePointer(event, TOOL_HANDLERS[activeTool].onPointerMove);
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    handlePointer(event, TOOL_HANDLERS[activeTool].onPointerUp);
  };

  const durationLabel = `${duration}${dotted ? "•" : ""}${triplet ? "3" : ""}`;
  const caretSystemIndex = helpers.getSystemIndexForTick(caretTick);
  const caretX = helpers.tickToX(caretTick);
  const caretYTop = (staffLines.get(caretSystemIndex) ?? [DEFAULT_LAYOUT.staffTop])[0] ?? DEFAULT_LAYOUT.staffTop;
  const caretYBottom = track.showTab
    ? (tabLines.get(caretSystemIndex) ?? []).slice(-1)[0] ?? caretYTop + 60
    : caretYTop + 60;
  const playbackX = isPlaying ? helpers.tickToX(playbackTick) : null;

  const getTabLinePosition = (systemIndex: number, stringIndex: number) => {
    const lines = tabLines.get(systemIndex) ?? [];
    return lines[stringIndex] ?? null;
  };
  const getStaffTop = (tick: number) =>
    helpers.systemTop(helpers.getSystemIndexForTick(tick)) + DEFAULT_LAYOUT.staffTop;

  return (
    <div className={styles.canvas}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <BackgroundLayer
          viewWidth={viewWidth}
          viewHeight={viewHeight}
          systemIndices={systemIndices}
          staffLines={staffLines}
          tabLines={tabLines}
          measureBars={measureBars}
          showTab={track.showTab}
          title={score.title}
          keySignature={score.keySignature}
          tempoBpm={score.tempoBpm}
          timeSignature={score.timeSignature}
          clef={track.clef}
        />

        <text x={DEFAULT_LAYOUT.marginLeft} y={64} className="score-label score-label--meta">
          Durée {durationLabel}
        </text>

        <NotesLayer
          noteEvents={noteEvents}
          restEvents={restEvents}
          chordEvents={chordEvents}
          selectedEventIds={selectedEventIds}
          tickToX={helpers.tickToX}
          pitchToY={helpers.pitchToY}
          getStaffTop={getStaffTop}
          scalePitchClassesSet={scalePitchClassesSet}
          ticksPerWhole={score.ticksPerWhole}
        />

        <TabLayer
          showTab={track.showTab}
          tabPositions={tabPositions}
          noteEvents={noteEvents}
          tickToX={helpers.tickToX}
          getTabLinePosition={getTabLinePosition}
          getSystemIndexForTick={helpers.getSystemIndexForTick}
        />

        <OverlayLayer
          caretX={caretX}
          caretYTop={caretYTop - 10}
          caretYBottom={caretYBottom + 10}
          playbackX={playbackX}
          showTab={track.showTab}
          selectionBox={selectionBox}
        />
      </svg>
    </div>
  );
};
