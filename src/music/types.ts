export type DurationTicks = number;

export type TimeSignature = {
  beats: number;
  beatUnit: number;
};

export type KeySignature = {
  key: string;
};

export type BaseEvent = {
  id: string;
  startTick: number;
  durationTicks: DurationTicks;
};

export type NoteEvent = BaseEvent & {
  type: "note";
  pitchMidi: number;
  accidental?: "sharp" | "flat" | "natural";
  tie?: boolean;
  articulations: string[];
  effects: string[];
};

export type RestEvent = BaseEvent & {
  type: "rest";
};

export type ChordSymbolEvent = BaseEvent & {
  type: "chordSymbol";
  symbol: string;
};

export type TimeSigChange = BaseEvent & {
  type: "timeSigChange";
  timeSignature: TimeSignature;
};

export type KeySigChange = BaseEvent & {
  type: "keySigChange";
  keySignature: KeySignature;
};

export type ScoreEvent =
  | NoteEvent
  | RestEvent
  | ChordSymbolEvent
  | TimeSigChange
  | KeySigChange;

export type Voice = {
  id: string;
  events: ScoreEvent[];
};

export type Measure = {
  id: string;
  timeSignature: TimeSignature;
  voices: Voice[];
};

export type Track = {
  id: string;
  name: string;
  instrumentId: string;
  measures: Measure[];
};

export type Score = {
  id: string;
  title: string;
  ticksPerQuarter: number;
  tracks: Track[];
};

export type ToolId = "select" | "note" | "rest" | "erase";
