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

export const mapNotesToTabPositions = (
  pitches: { id: string; pitchMidi: number }[],
  instrument: InstrumentDefinition
) => {
  if (!instrument.strings) {
    return new Map<string, TabPosition>();
  }

  const positions = new Map<string, TabPosition>();
  let previous: TabPosition | null = null;

  pitches.forEach(({ id, pitchMidi }) => {
    const candidates = instrument.strings
      .map((stringMidi, index) => ({
        stringIndex: index,
        fret: pitchMidi - stringMidi,
      }))
      .filter((candidate) => candidate.fret >= 0 && candidate.fret <= 24)
      .sort((a, b) => a.fret - b.fret);

    if (candidates.length === 0) {
      return;
    }

    const lowestFret = candidates[0].fret;
    const lowestCandidates = candidates.filter((candidate) => candidate.fret === lowestFret);

    const chosen = previous
      ? lowestCandidates.reduce((best, candidate) => {
          const bestDistance =
            Math.abs(best.fret - previous.fret) + Math.abs(best.stringIndex - previous.stringIndex);
          const candidateDistance =
            Math.abs(candidate.fret - previous.fret) +
            Math.abs(candidate.stringIndex - previous.stringIndex);
          return candidateDistance < bestDistance ? candidate : best;
        }, lowestCandidates[0])
      : lowestCandidates[0];

    positions.set(id, chosen);
    previous = chosen;
  });

  return positions;
};
