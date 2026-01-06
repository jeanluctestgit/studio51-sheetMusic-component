import { useMemo, useRef, useState } from "react";
import { useScoreStore } from "../store/scoreStore";
import { NoteEvent } from "../music/types";
import { mapPitchToTab } from "../music/mapping";
import { pitchToY, quantizeTick, STAFF_STEP_PX, yToPitch } from "../music/pitchUtils";
import { Staff } from "../svg/Staff";
import { NoteHead } from "../svg/NoteHead";
import { TabNumber } from "../svg/TabNumber";
import { Caret } from "../svg/Caret";
import { hitTestNotes } from "../editor/hitTest";
import { NoteTool } from "../editor/tools/NoteTool";
import { SelectTool } from "../editor/tools/SelectTool";
import { EraseTool } from "../editor/tools/EraseTool";

const VIEWBOX_WIDTH = 960;
const VIEWBOX_HEIGHT = 360;
const STAFF_X = 80;
const STAFF_TOP = 40;
const LINE_SPACING = 12;
const TAB_GAP = 36;
const BEAT_WIDTH = 90;

const toolMap = {
  note: NoteTool,
  select: SelectTool,
  erase: EraseTool,
};

type DragState = {
  id: string;
  startX: number;
  startY: number;
  lastDeltaTicks: number;
  lastDeltaPitch: number;
};

export const Viewport = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const {
    score,
    caret,
    selection,
    activeTool,
    activeDurationTicks,
    setCaret,
    insertNoteAtCaret,
    insertRestAtCaret,
    removeEvent,
    selectSingle,
    toggleSelection,
    moveEvent,
  } = useScoreStore();

  const measure = score.tracks[0].measures[0];
  const voice = measure.voices[0];
  const staffBottom = STAFF_TOP + LINE_SPACING * 4;
  const tabTop = STAFF_TOP + LINE_SPACING * 5 + TAB_GAP;
  const tabBottom = tabTop + LINE_SPACING * 5;

  const noteLayouts = useMemo(() => {
    return voice.events
      .filter((event): event is NoteEvent => event.type === "note")
      .map((event) => ({
        id: event.id,
        event,
        x: STAFF_X + (event.startTick / score.ticksPerQuarter) * BEAT_WIDTH,
        y: pitchToY(event.pitchMidi, staffBottom),
        radius: 10,
      }));
  }, [score.ticksPerQuarter, staffBottom, voice.events]);

  const beamGroups = useMemo(() => {
    const beams: { x1: number; x2: number; y: number }[] = [];
    const sorted = [...noteLayouts].sort((a, b) => a.event.startTick - b.event.startTick);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (current.event.durationTicks <= 240 && next.event.durationTicks <= 240) {
        const y = Math.min(current.y, next.y) - 32;
        beams.push({ x1: current.x + 6, x2: next.x + 6, y });
      }
    }
    return beams;
  }, [noteLayouts]);

  const toSvgPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const setCaretFromPoint = (point: { x: number; y: number }) => {
    const rawTicks = ((point.x - STAFF_X) / BEAT_WIDTH) * score.ticksPerQuarter;
    const snappedTick = Math.max(0, quantizeTick(rawTicks, activeDurationTicks));
    const snappedPitch = yToPitch(point.y, staffBottom);
    setCaret(snappedTick, snappedPitch);
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = toSvgPoint(event);
    const noteHit = hitTestNotes(noteLayouts, point.x, point.y)?.event;

    if (activeTool === "rest") {
      setCaretFromPoint(point);
      insertRestAtCaret();
      return;
    }

    const tool = toolMap[activeTool as keyof typeof toolMap];
    if (tool) {
      tool.onPointerDown({
        point,
        shiftKey: event.shiftKey,
        noteHit,
        setCaretFromPoint,
        insertNoteAtCaret,
        insertRestAtCaret,
        removeEvent,
        selectSingle,
        toggleSelection,
      });
    }

    if (activeTool === "select" && noteHit) {
      setDragState({
        id: noteHit.id,
        startX: point.x,
        startY: point.y,
        lastDeltaTicks: 0,
        lastDeltaPitch: 0,
      });
    }
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState) {
      return;
    }
    const point = toSvgPoint(event);
    const dx = point.x - dragState.startX;
    const dy = point.y - dragState.startY;
    const deltaTicks = quantizeTick((dx / BEAT_WIDTH) * score.ticksPerQuarter, 60);
    const deltaPitch = Math.round(-dy / STAFF_STEP_PX);

    const applyTicks = deltaTicks - dragState.lastDeltaTicks;
    const applyPitch = deltaPitch - dragState.lastDeltaPitch;

    if (applyTicks !== 0 || applyPitch !== 0) {
      moveEvent(dragState.id, applyTicks, applyPitch);
      setDragState({
        ...dragState,
        lastDeltaTicks: deltaTicks,
        lastDeltaPitch: deltaPitch,
      });
    }
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="h-[360px] w-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#0f172a" rx={16} />
        <Staff
          x={STAFF_X}
          y={STAFF_TOP}
          width={VIEWBOX_WIDTH - STAFF_X * 2}
          lineSpacing={LINE_SPACING}
          showTab
        />
        {beamGroups.map((beam, index) => (
          <line
            key={`beam-${index}`}
            x1={beam.x1}
            x2={beam.x2}
            y1={beam.y}
            y2={beam.y}
            stroke="#e2e8f0"
            strokeWidth={4}
          />
        ))}
        {noteLayouts.map((layout) => {
          const isSelected = selection.includes(layout.id);
          const stemUp = layout.event.pitchMidi < 72;
          const stemHeight = 32;
          const stemX = layout.x + 6;
          const stemY = stemUp ? layout.y - stemHeight : layout.y + stemHeight;

          const tabPosition = mapPitchToTab(layout.event.pitchMidi, score.tracks[0].instrumentId);
          const tabY = tabTop + tabPosition.stringIndex * LINE_SPACING;
          const tabX = layout.x;

          return (
            <g key={layout.id}>
              {isSelected && (
                <circle cx={layout.x} cy={layout.y} r={12} fill="rgba(59,130,246,0.25)" />
              )}
              <NoteHead cx={layout.x} cy={layout.y} filled={layout.event.durationTicks <= 960} />
              <line
                x1={stemX}
                x2={stemX}
                y1={layout.y}
                y2={stemY}
                stroke="#e2e8f0"
                strokeWidth={1.5}
              />
              <TabNumber x={tabX} y={tabY} value={tabPosition.fret} />
            </g>
          );
        })}
        <Caret x={STAFF_X + (caret.tick / score.ticksPerQuarter) * BEAT_WIDTH} yTop={STAFF_TOP - 8} yBottom={tabBottom + 8} />
      </svg>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
        <span>Click to insert. Drag with Select to move pitch/time.</span>
        <span>Shortcuts: 1–6 duration, arrows caret, delete removes, Cmd/Ctrl+Z/Y undo/redo.</span>
      </div>
    </section>
  );
};
