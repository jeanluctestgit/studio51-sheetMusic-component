export type Clef = "treble" | "bass";

export type DurationValue = "1/1" | "1/2" | "1/4" | "1/8" | "1/16" | "1/32";

export type ToolId = "select" | "note" | "rest" | "erase";

export type Articulation = "staccato" | "accent" | "tenuto" | "slur" | "tie";

export type Ornament = "trill" | "mordent";

export type Effect =
  | "slide"
  | "hammer-on"
  | "pull-off"
  | "bend"
  | "vibrato"
  | "palm-mute"
  | "let-ring"
  | "harmonic";

export interface TimeSignature {
  beats: number;
  beatUnit: number;
}

export type KeySignature =
  | "C"
  | "G"
  | "D"
  | "A"
  | "E"
  | "B"
  | "F#"
  | "C#"
  | "F"
  | "Bb"
  | "Eb"
  | "Ab"
  | "Db"
  | "Gb"
  | "Cb";

export interface Score {
  id: string;
  title: string;
  tempoBpm: number;
  timeSignature: TimeSignature;
  keySignature: KeySignature;
  ticksPerWhole: number;
  tracks: Track[];
}

export interface Track {
  id: string;
  name: string;
  clef: Clef;
  instrumentId: string | null;
  showTab: boolean;
  measures: Measure[];
}

export interface Measure {
  id: string;
  index: number;
  voices: Voice[];
}

export interface Voice {
  id: string;
  events: ScoreEvent[];
}

export type ScoreEvent =
  | NoteEvent
  | RestEvent
  | ChordSymbolEvent
  | TimeSigChangeEvent
  | KeySigChangeEvent;

export interface BaseEvent {
  id: string;
  startTick: number;
}

export interface NoteEvent extends BaseEvent {
  type: "note";
  durationTicks: number;
  pitchMidi: number;
  accidental?: "#" | "b" | "natural";
  tie?: boolean;
  articulations: Articulation[];
  ornaments: Ornament[];
  effects: Effect[];
}

export interface RestEvent extends BaseEvent {
  type: "rest";
  durationTicks: number;
}

export interface ChordSymbolEvent extends BaseEvent {
  type: "chord";
  symbol: string;
}

export interface TimeSigChangeEvent extends BaseEvent {
  type: "timeSig";
  timeSignature: TimeSignature;
}

export interface KeySigChangeEvent extends BaseEvent {
  type: "keySig";
  keySignature: KeySignature;
}
