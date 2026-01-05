import { memo, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { useEditorStore } from "../editor/store";
import { DEFAULT_LAYOUT, createLayoutHelpers } from "../editor/layout";
import { TOOL_HANDLERS, type DragState, type SelectionBox, type ToolContext } from "../editor/tools";
import { getInstrumentById } from "../music/instruments";
import type { NoteEvent, RestEvent, ScoreEvent } from "../music/types";
import { scalePitchClasses } from "../music/scales";
import { mapNotesToTabPositions } from "../music/mapping";

const NOTE_RADIUS = 6;
const STEM_HEIGHT = 34;

const isNote = (event: ScoreEvent): event is NoteEvent => event.type === "note";
const isRest = (event: ScoreEvent): event is RestEvent => event.type === "rest";

interface BackgroundLayerProps {
  viewWidth: number;
  viewHeight: number;
  staffLines: number[];
  tabLines: number[];
  measureBars: number[];
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

      {staffLines.map((y, index) => (
        <line key={`staff-${index}`} x1={DEFAULT_LAYOUT.marginLeft} y1={y} x2={viewWidth - 40} y2={y} />
      ))}

      {showTab &&
        tabLines.map((y, index) => (
          <line key={`tab-${index}`} x1={DEFAULT_LAYOUT.marginLeft} y1={y} x2={viewWidth - 40} y2={y} />
        ))}

      {measureBars.map((x, index) => (
        <line
          key={`bar-${index}`}
          x1={x}
          y1={DEFAULT_LAYOUT.staffTop}
          x2={x}
          y2={showTab ? tabLines[tabLines.length - 1] : DEFAULT_LAYOUT.staffTop + 48}
          className="barline"
        />
      ))}

      <text x={DEFAULT_LAYOUT.marginLeft - 30} y={DEFAULT_LAYOUT.staffTop + 30} className="clef">
        {clef === "treble" ? "𝄞" : "𝄢"}
      </text>
      <text x={DEFAULT_LAYOUT.marginLeft - 10} y={DEFAULT_LAYOUT.staffTop + 10} className="signature">
        {keySignature}
      </text>
      <text x={DEFAULT_LAYOUT.marginLeft + 20} y={DEFAULT_LAYOUT.staffTop + 18} className="signature">
        {timeSignature.beats}
      </text>
      <text x={DEFAULT_LAYOUT.marginLeft + 20} y={DEFAULT_LAYOUT.staffTop + 38} className="signature">
        {timeSignature.beatUnit}
      </text>
    </g>
  )
);

BackgroundLayer.displayName = "BackgroundLayer";

interface NotesLayerProps {
  noteEvents: NoteEvent[];
  restEvents: RestEvent[];
  chordEvents: ScoreEvent[];
  selectedEventIds: string[];
  tickToX: (tick: number) => number;
  pitchToY: (pitch: number) => number;
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
    scalePitchClassesSet,
    ticksPerWhole,
  }: NotesLayerProps) => {
    const beamGroups = noteEvents.reduce<NoteEvent[][]>((groups, note) => {
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
            <text key={event.id} x={tickToX(event.startTick)} y={DEFAULT_LAYOUT.staffTop - 12} className="chord-symbol">
              {event.symbol}
            </text>
          ) : null
        )}

        {restEvents.map((event) => {
          const x = tickToX(event.startTick);
          return (
            <g key={event.id} data-event-id={event.id} className="rest">
              <rect x={x - 4} y={DEFAULT_LAYOUT.staffTop + 10} width={8} height={8} rx={2} />
            </g>
          );
        })}

        {noteEvents.map((note) => {
          const x = tickToX(note.startTick);
          const y = pitchToY(note.pitchMidi);
          const isSelected = selectedEventIds.includes(note.id);
          const inScale = scalePitchClassesSet?.has(((note.pitchMidi % 12) + 12) % 12);

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
            const y = pitchToY(note.pitchMidi) - STEM_HEIGHT;
            return { x, y };
          });
          const first = points[0];
          const last = points[points.length - 1];
          return (
            <line key={`beam-${groupIndex}`} x1={first.x} y1={first.y} x2={last.x} y2={last.y} className="beam" />
          );
        })}
      </g>
    );
  }
);

NotesLayer.displayName = "NotesLayer";

interface TabLayerProps {
  tabLines: number[];
  showTab: boolean;
  tabPositions: Map<string, { strings: number[]; frets: number[] }>;
  noteEvents: NoteEvent[];
  tickToX: (tick: number) => number;
}

const TabLayer = memo(({ tabLines, showTab, tabPositions, noteEvents, tickToX }: TabLayerProps) => {
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
        const y = tabLines[position.strings[0]];
        return (
          <text key={`tab-${note.id}`} x={x - 4} y={y + 4} className="tab-number">
            {position.frets[0]}
          </text>
        );
      })}
    </g>
  );
});

TabLayer.displayName = "TabLayer";

interface OverlayLayerProps {
  caretX: number;
  showTab: boolean;
  selectionBox: SelectionBox | null;
  tabLines: number[];
}

const OverlayLayer = memo(({ caretX, showTab, selectionBox, tabLines }: OverlayLayerProps) => (
  <g className="score-layer score-layer--overlay">
    <line
      x1={caretX}
      y1={DEFAULT_LAYOUT.staffTop - 10}
      x2={caretX}
      y2={showTab ? tabLines[tabLines.length - 1] + 10 : DEFAULT_LAYOUT.staffTop + 60}
      className="caret"
    />
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
));

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
  } = useEditorStore();

  const track = score.tracks.find((item) => item.id === selectedTrackId) ?? score.tracks[0];
  const instrument = getInstrumentById(track.instrumentId);
  const helpers = useMemo(
    () => createLayoutHelpers(DEFAULT_LAYOUT, score.timeSignature, score.ticksPerWhole, track.clef),
    [score.timeSignature, score.ticksPerWhole, track.clef]
  );
  const viewWidth = DEFAULT_LAYOUT.marginLeft + DEFAULT_LAYOUT.measureWidth * DEFAULT_LAYOUT.measuresPerSystem + 80;
  const viewHeight = track.showTab ? 320 : 220;

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
    return mapNotesToTabPositions(
      ordered.map((note) => ({ id: note.id, pitchMidi: note.pitchMidi, startTick: note.startTick })),
      instrument
    );
  }, [instrument, noteEvents]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const staffLines = useMemo(() => helpers.staffLinePositions, [helpers.staffLinePositions]);

  const tabLines = useMemo(
    () =>
      instrument.strings
        ? Array.from(
            { length: instrument.strings.length },
            (_, index) => DEFAULT_LAYOUT.tabTop + index * DEFAULT_LAYOUT.tabLineSpacing
          )
        : [],
    [instrument.id]
  );

  const measureBars = useMemo(
    () => Array.from({ length: DEFAULT_LAYOUT.measuresPerSystem + 1 }, (_, index) => DEFAULT_LAYOUT.marginLeft + index * DEFAULT_LAYOUT.measureWidth),
    []
  );

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
      helpers,
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

  return (
    <div className="score-canvas">
      <svg
        ref={svgRef}
        className="score-svg"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <BackgroundLayer
          viewWidth={viewWidth}
          viewHeight={viewHeight}
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
          scalePitchClassesSet={scalePitchClassesSet}
          ticksPerWhole={score.ticksPerWhole}
        />

        <TabLayer
          tabLines={tabLines}
          showTab={track.showTab}
          tabPositions={tabPositions}
          noteEvents={noteEvents}
          tickToX={helpers.tickToX}
        />

        <OverlayLayer
          caretX={helpers.tickToX(caretTick)}
          showTab={track.showTab}
          selectionBox={selectionBox}
          tabLines={tabLines}
        />
      </svg>
    </div>
  );
};
