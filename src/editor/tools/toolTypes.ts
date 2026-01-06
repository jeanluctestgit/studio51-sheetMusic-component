import { NoteEvent } from "../../music/types";

export type PointerPoint = {
  x: number;
  y: number;
};

export type ToolContext = {
  point: PointerPoint;
  shiftKey: boolean;
  noteHit?: NoteEvent;
  setCaretFromPoint: (point: PointerPoint) => void;
  insertNoteAtCaret: () => void;
  insertRestAtCaret: () => void;
  removeEvent: (id: string) => void;
  selectSingle: (id: string | null) => void;
  toggleSelection: (id: string) => void;
};
