import type { PointerEvent } from "react";
import type { InstrumentDefinition } from "../music/instruments";
import type { MusicalEvent, ScoreEvent, ToolId } from "../music/types";
import type { HitTestResult } from "./layout";
import { mapTabToPitch } from "../music/mapping";

export interface DragState {
  eventId: string;
  originTick: number;
  originPitch: number;
  startX: number;
  startY: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface ToolContext {
  event: PointerEvent<SVGSVGElement>;
  pointer: { x: number; y: number };
  eventId: string | null;
  position: HitTestResult;
  noteEvents: MusicalEvent[];
  allEvents: ScoreEvent[];
  dragState: DragState | null;
  selectionBox: SelectionBox | null;
  setDragState: (state: DragState | null) => void;
  setSelectionBox: (state: SelectionBox | null) => void;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  addNoteAt: (payload: {
    tick: number;
    pitchMidi: number;
    performanceHints?: { string?: number; fret?: number };
  }) => void;
  addRestAt: (tick: number) => void;
  removeEvent: (id: string) => void;
  updateEvent: (event: ScoreEvent) => void;
  setCaretTick: (tick: number) => void;
  activeFret: number;
  instrument: InstrumentDefinition;
  helpers: {
    tickToX: (tick: number) => number;
    xToTick: (x: number, systemIndex: number) => number;
    pitchToY: (pitch: number, tick: number) => number;
    yToPitch: (y: number, systemIndex: number) => number;
  };
}

export interface ToolHandler {
  id: ToolId;
  onPointerDown: (context: ToolContext) => void;
  onPointerMove: (context: ToolContext) => void;
  onPointerUp: (context: ToolContext) => void;
}

export const SelectTool: ToolHandler = {
  id: "select",
  onPointerDown: ({
    event,
    pointer,
    eventId,
    position,
    allEvents,
    setCaretTick,
    setSelection,
    toggleSelection,
    setDragState,
    setSelectionBox,
    updateEvent,
    activeFret,
    instrument,
  }) => {
    setCaretTick(position.tick);
    if (position.isTab && position.tabStringIndex !== null && eventId) {
      const eventToUpdate = allEvents.find((item) => item.id === eventId);
      if (eventToUpdate?.type === "note") {
        const pitch = mapTabToPitch(position.tabStringIndex, activeFret, instrument);
        if (pitch != null) {
          updateEvent({
            ...eventToUpdate,
            pitches: [pitch],
            performanceHints: { ...eventToUpdate.performanceHints, string: position.tabStringIndex, fret: activeFret },
          });
        }
      }
    }

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
          originPitch: draggedEvent.pitches[0] ?? 60,
          startX: pointer.x,
          startY: pointer.y,
        });
      }
    } else {
      setSelection([]);
      setSelectionBox({
        startX: pointer.x,
        startY: pointer.y,
        endX: pointer.x,
        endY: pointer.y,
      });
    }
  },
  onPointerMove: ({ dragState, selectionBox, pointer, allEvents, updateEvent, helpers, setSelectionBox, position }) => {
    if (dragState) {
      const deltaX = pointer.x - dragState.startX;
      const deltaY = pointer.y - dragState.startY;
      const deltaTicks =
        helpers.xToTick(helpers.tickToX(dragState.originTick) + deltaX, position.systemIndex) -
        dragState.originTick;
      const deltaPitch =
        helpers.yToPitch(helpers.pitchToY(dragState.originPitch, dragState.originTick) + deltaY, position.systemIndex) -
        dragState.originPitch;

      const eventToUpdate = allEvents.find((item) => item.id === dragState.eventId);
      if (eventToUpdate && eventToUpdate.type === "note") {
        updateEvent({
          ...eventToUpdate,
          startTick: Math.max(0, dragState.originTick + deltaTicks),
          pitches: eventToUpdate.pitches.map((pitch) => pitch + deltaPitch),
        });
      }
    }

    if (selectionBox) {
      setSelectionBox({
        ...selectionBox,
        endX: pointer.x,
        endY: pointer.y,
      });
    }
  },
  onPointerUp: ({ selectionBox, noteEvents, helpers, setSelection, setSelectionBox, setDragState }) => {
    if (selectionBox) {
      const left = Math.min(selectionBox.startX, selectionBox.endX);
      const right = Math.max(selectionBox.startX, selectionBox.endX);
      const top = Math.min(selectionBox.startY, selectionBox.endY);
      const bottom = Math.max(selectionBox.startY, selectionBox.endY);
      const selected = noteEvents
        .filter((note) => {
          const x = helpers.tickToX(note.startTick);
          const y = helpers.pitchToY(note.pitches[0] ?? 60, note.startTick);
          return x >= left && x <= right && y >= top && y <= bottom;
        })
        .map((note) => note.id);
      setSelection(selected);
      setSelectionBox(null);
    }
    setDragState(null);
  },
};

export const NoteTool: ToolHandler = {
  id: "note",
  onPointerDown: ({ position, setCaretTick, addNoteAt, activeFret, instrument }) => {
    setCaretTick(position.tick);
    if (position.isTab && position.tabStringIndex !== null) {
      const pitch = mapTabToPitch(position.tabStringIndex, activeFret, instrument);
      if (pitch != null) {
        addNoteAt({
          tick: position.tick,
          pitchMidi: pitch,
          performanceHints: { string: position.tabStringIndex, fret: activeFret },
        });
      }
      return;
    }
    addNoteAt({ tick: position.tick, pitchMidi: position.pitchMidi });
  },
  onPointerMove: () => {},
  onPointerUp: () => {},
};

export const RestTool: ToolHandler = {
  id: "rest",
  onPointerDown: ({ position, setCaretTick, addRestAt }) => {
    setCaretTick(position.tick);
    addRestAt(position.tick);
  },
  onPointerMove: () => {},
  onPointerUp: () => {},
};

export const EraseTool: ToolHandler = {
  id: "erase",
  onPointerDown: ({ eventId, removeEvent }) => {
    if (eventId) {
      removeEvent(eventId);
    }
  },
  onPointerMove: () => {},
  onPointerUp: () => {},
};

export const TOOL_HANDLERS: Record<ToolId, ToolHandler> = {
  select: SelectTool,
  note: NoteTool,
  rest: RestTool,
  erase: EraseTool,
};
