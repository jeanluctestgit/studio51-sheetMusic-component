import { NoteEvent } from "../music/types";

export type NoteLayout = {
  id: string;
  x: number;
  y: number;
  radius: number;
  event: NoteEvent;
};

export const hitTestNotes = (notes: NoteLayout[], x: number, y: number) => {
  return notes.find((note) => {
    const dx = x - note.x;
    const dy = y - note.y;
    return Math.sqrt(dx * dx + dy * dy) <= note.radius + 4;
  });
};
