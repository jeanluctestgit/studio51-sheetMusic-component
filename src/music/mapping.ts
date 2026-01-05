import type { InstrumentDefinition } from "./instruments";

export interface TabPosition {
  stringIndex: number;
  fret: number;
}

export const mapPitchToTab = (
  pitchMidi: number,
  instrument: InstrumentDefinition
): TabPosition | null => {
  if (!instrument.strings) {
    return null;
  }

  const options = instrument.strings
    .map((stringMidi, index) => ({
      stringIndex: index,
      fret: pitchMidi - stringMidi,
    }))
    .filter((candidate) => candidate.fret >= 0 && candidate.fret <= 24)
    .sort((a, b) => a.fret - b.fret);

  return options[0] ?? null;
};
