export type BaseDuration = "1/1" | "1/2" | "1/4" | "1/8" | "1/16" | "1/32";

export type Tuplet = {
  n: number;
  inTimeOf: number;
};

export type RhythmState = {
  baseDuration: BaseDuration;
  dotted: boolean;
  tuplet: Tuplet | null;
  isRest: boolean;
};

export type RhythmEvent = {
  id: string;
  pitch?: string;
  string?: number;
  fret?: number;
  baseDuration: BaseDuration;
  dotted: boolean;
  tuplet: Tuplet | null;
  isRest: boolean;
  voice?: number;
};

export type TimeSignature = {
  beats: number;
  beatUnit: number;
};
