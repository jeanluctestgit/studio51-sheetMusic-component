export type BaseDuration = "1/1" | "1/2" | "1/4" | "1/8" | "1/16" | "1/32";

export type Tuplet = {
  n: number;
  inTimeOf: number;
};

export type RhythmEventBase = {
  id: string;
  baseDuration: BaseDuration;
  dotted: boolean;
  tuplet: Tuplet | null;
};

export type RhythmState = {
  baseDuration: BaseDuration;
  dotted: boolean;
  tuplet: Tuplet | null;
  isRest: boolean;
};

export type RestEvent = RhythmEventBase & {
  isRest: true;
};

export type NoteEvent = RhythmEventBase & {
  isRest: false;
  string: number;
  fret: number;
  pitch: string;
};

export type RhythmEvent = NoteEvent | RestEvent;

export const isRestEvent = (event: RhythmEvent): event is RestEvent => event.isRest;
export const isNoteEvent = (event: RhythmEvent): event is NoteEvent => !event.isRest;

export type TimeSignature = {
  beats: number;
  beatUnit: number;
};
