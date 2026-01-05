import type { PointerEvent } from "react";
import type { NoteEvent, ScoreEvent, ToolId } from "../music/types";

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

export interface HitTestResult {
  measureIndex: number;
  tick: number;
  staffLine: number | null;
  pitchMidi: number;
  snappedX: number;
}

export interface ToolContext {
  event: PointerEvent<SVGSVGElement>;
  pointer: { x: number; y: number };
  eventId: string | null;
  position: HitTestResult;
  noteEvents: NoteEvent[];
  allEvents: ScoreEvent[];
  dragState: DragState | null;
  selectionBox: SelectionBox | null;
  setDragState: (state: DragState | null) => void;
  setSelectionBox: (state: SelectionBox | null) => void;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  addNoteAt: (tick: number, pitchMidi: number) => void;
  addRestAt: (tick: number) => void;
  removeEvent: (id: string) => void;
  updateEvent: (event: ScoreEvent) => void;
  setCaretTick: (tick: number) => void;
  helpers: {
    tickToX: (tick: number) => number;
    xToTick: (x: number) => number;
    pitchToY: (pitch: number) => number;
    yToPitch: (y: number) => number;
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
  }) => {
    setCaretTick(position.tick);
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
  onPointerMove: ({ dragState, selectionBox, pointer, allEvents, updateEvent, helpers, setSelectionBox }) => {
    if (dragState) {
      const deltaX = pointer.x - dragState.startX;
      const deltaY = pointer.y - dragState.startY;
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
          const y = helpers.pitchToY(note.pitchMidi);
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
  onPointerDown: ({ position, setCaretTick, addNoteAt }) => {
    setCaretTick(position.tick);
    addNoteAt(position.tick, position.pitchMidi);
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
