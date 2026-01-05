import { useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { useEditorStore } from "../editor/store";
import { DEFAULT_LAYOUT, createLayoutHelpers } from "../editor/layout";
import { getInstrumentById } from "../music/instruments";
import type { NoteEvent, RestEvent, ScoreEvent } from "../music/types";
import { scalePitchClasses } from "../music/scales";
import { mapPitchToTab } from "../music/mapping";

interface DragState {
  eventId: string;
  originTick: number;
  originPitch: number;
  startX: number;
  startY: number;
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const NOTE_RADIUS = 6;
const STEM_HEIGHT = 34;

const isNote = (event: ScoreEvent): event is NoteEvent => event.type === "note";
const isRest = (event: ScoreEvent): event is RestEvent => event.type === "rest";

export const StaffView = () => {
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

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  const durationLabel = `${duration}${dotted ? "•" : ""}${triplet ? "3" : ""}`;

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const tick = helpers.xToTick(x);
    setCaretTick(tick);

    const target = event.target as HTMLElement;
    const eventId = target.getAttribute("data-event-id");

    if (activeTool === "note") {
      addNoteAt(tick, helpers.yToPitch(y));
      return;
    }

    if (activeTool === "rest") {
      addRestAt(tick);
      return;
    }

    if (activeTool === "erase" && eventId) {
      removeEvent(eventId);
      return;
    }

    if (activeTool === "select") {
      if (eventId) {
        if (event.shiftKey) {
          toggleSelection(eventId);
        } else {
          setSelection([eventId]);
        }
        const draggedEvent = allEvents.find((item) => item.id === eventId);
        if (draggedEvent && draggedEvent.type === "note") {
          setDragState({
            eventId,
            originTick: draggedEvent.startTick,
            originPitch: draggedEvent.pitchMidi,
            startX: x,
            startY: y,
          });
        }
      } else {
        setSelection([]);
        setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
      }
    }
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    if (dragState) {
      const deltaX = x - dragState.startX;
      const deltaY = y - dragState.startY;
      const deltaTicks = helpers.xToTick(helpers.tickToX(dragState.originTick) + deltaX) - dragState.originTick;
      const deltaPitch = helpers.yToPitch(helpers.pitchToY(dragState.originPitch) + deltaY) - dragState.originPitch;

      const eventToUpdate = allEvents.find((item) => item.id === dragState.eventId);
      if (eventToUpdate && eventToUpdate.type === "note") {
        updateEvent({
          ...eventToUpdate,
          startTick: Math.max(0, dragState.originTick + deltaTicks),
          pitchMidi: dragState.originPitch + deltaPitch,
        });
      }
    }

    if (selectionBox) {
      setSelectionBox({
        ...selectionBox,
        endX: x,
        endY: y,
      });
    }
  };

  const handlePointerUp = () => {
    if (selectionBox) {
      const left = Math.min(selectionBox.startX, selectionBox.endX);
      const right = Math.max(selectionBox.startX, selectionBox.endX);
      const top = Math.min(selectionBox.startY, selectionBox.endY);
      const bottom = Math.max(selectionBox.startY, selectionBox.endY);
      const selected = noteEvents
        .filter((note) => {
          const x = helpers.tickToX(note.startTick);
          const y = helpers.pitchToY(note.pitchMidi);
          return x >= left && x <= right && y >= top && y <= bottom;
        })
        .map((note) => note.id);
      setSelection(selected);
      setSelectionBox(null);
    }
    setDragState(null);
  };

  const staffLines = Array.from({ length: 5 }, (_, index) =>
    DEFAULT_LAYOUT.staffTop + index * DEFAULT_LAYOUT.staffLineSpacing
  );

  const tabLines = instrument.strings
    ? Array.from({ length: instrument.strings.length }, (_, index) =>
        DEFAULT_LAYOUT.tabTop + index * DEFAULT_LAYOUT.tabLineSpacing
      )
    : [];

  const measureBars = Array.from({ length: DEFAULT_LAYOUT.measuresPerSystem + 1 }, (_, index) =>
    DEFAULT_LAYOUT.marginLeft + index * DEFAULT_LAYOUT.measureWidth
  );

  const beamGroups = noteEvents.reduce<NoteEvent[][]>((groups, note) => {
    if (note.durationTicks > score.ticksPerWhole / 8) {
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
    <div className="score-canvas">
      <svg
        ref={svgRef}
        className="score-svg"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <rect x={0} y={0} width={viewWidth} height={viewHeight} rx={16} />
        <text x={DEFAULT_LAYOUT.marginLeft} y={30} className="score-label">
          {score.title}
        </text>
        <text x={DEFAULT_LAYOUT.marginLeft} y={48} className="score-label score-label--meta">
          {score.keySignature} • {score.timeSignature.beats}/{score.timeSignature.beatUnit} • Durée {durationLabel}
        </text>

        {staffLines.map((y, index) => (
          <line key={`staff-${index}`} x1={DEFAULT_LAYOUT.marginLeft} y1={y} x2={viewWidth - 40} y2={y} />
        ))}

        {track.showTab &&
          tabLines.map((y, index) => (
            <line key={`tab-${index}`} x1={DEFAULT_LAYOUT.marginLeft} y1={y} x2={viewWidth - 40} y2={y} />
          ))}

        {measureBars.map((x, index) => (
          <line
            key={`bar-${index}`}
            x1={x}
            y1={DEFAULT_LAYOUT.staffTop}
            x2={x}
            y2={track.showTab ? tabLines[tabLines.length - 1] : DEFAULT_LAYOUT.staffTop + 48}
            className="barline"
          />
        ))}

        <text x={DEFAULT_LAYOUT.marginLeft - 30} y={DEFAULT_LAYOUT.staffTop + 30} className="clef">
          {track.clef === "treble" ? "𝄞" : "𝄢"}
        </text>
        <text x={DEFAULT_LAYOUT.marginLeft - 10} y={DEFAULT_LAYOUT.staffTop + 10} className="signature">
          {score.keySignature}
        </text>
        <text x={DEFAULT_LAYOUT.marginLeft + 20} y={DEFAULT_LAYOUT.staffTop + 18} className="signature">
          {score.timeSignature.beats}
        </text>
        <text x={DEFAULT_LAYOUT.marginLeft + 20} y={DEFAULT_LAYOUT.staffTop + 38} className="signature">
          {score.timeSignature.beatUnit}
        </text>

        {chordEvents.map((event) => (
          <text
            key={event.id}
            x={helpers.tickToX(event.startTick)}
            y={DEFAULT_LAYOUT.staffTop - 12}
            className="chord-symbol"
          >
            {event.symbol}
          </text>
        ))}

        {restEvents.map((event) => {
          const x = helpers.tickToX(event.startTick);
          return (
            <g key={event.id} data-event-id={event.id} className="rest">
              <rect x={x - 4} y={DEFAULT_LAYOUT.staffTop + 10} width={8} height={8} rx={2} />
            </g>
          );
        })}

        {noteEvents.map((note) => {
          const x = helpers.tickToX(note.startTick);
          const y = helpers.pitchToY(note.pitchMidi);
          const isSelected = selectedEventIds.includes(note.id);
          const inScale = scalePitchClassesSet?.has(((note.pitchMidi % 12) + 12) % 12);

          return (
            <g key={note.id} data-event-id={note.id} className={`note ${isSelected ? "is-selected" : ""}`}>
              <circle
                cx={x}
                cy={y}
                r={NOTE_RADIUS}
                className={`notehead ${inScale ? "notehead--scale" : ""}`}
              />
              <line
                x1={x + NOTE_RADIUS}
                y1={y}
                x2={x + NOTE_RADIUS}
                y2={y - STEM_HEIGHT}
                className="stem"
              />
              {note.articulations.includes("staccato") && (
                <circle cx={x} cy={y - 20} r={2} className="ornament" />
              )}
            </g>
          );
        })}

        {beamGroups.map((group, groupIndex) => {
          if (group.length < 2) {
            return null;
          }
          const points = group.map((note) => {
            const x = helpers.tickToX(note.startTick) + NOTE_RADIUS;
            const y = helpers.pitchToY(note.pitchMidi) - STEM_HEIGHT;
            return { x, y };
          });
          const first = points[0];
          const last = points[points.length - 1];
          return (
            <line
              key={`beam-${groupIndex}`}
              x1={first.x}
              y1={first.y}
              x2={last.x}
              y2={last.y}
              className="beam"
            />
          );
        })}

        {track.showTab &&
          noteEvents.map((note) => {
            const position = mapPitchToTab(note.pitchMidi, instrument);
            if (!position) {
              return null;
            }
            const x = helpers.tickToX(note.startTick);
            const y = tabLines[position.stringIndex];
            return (
              <text key={`tab-${note.id}`} x={x - 4} y={y + 4} className="tab-number">
                {position.fret}
              </text>
            );
          })}

        <line
          x1={helpers.tickToX(caretTick)}
          y1={DEFAULT_LAYOUT.staffTop - 10}
          x2={helpers.tickToX(caretTick)}
          y2={track.showTab ? tabLines[tabLines.length - 1] + 10 : DEFAULT_LAYOUT.staffTop + 60}
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
      </svg>
    </div>
  );
};
