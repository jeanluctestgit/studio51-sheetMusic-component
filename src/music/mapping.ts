export type InstrumentDefinition = {
  id: string;
  name: string;
  strings: number[];
};

export const INSTRUMENTS: Record<string, InstrumentDefinition> = {
  guitar: {
    id: "guitar",
    name: "Guitar (EADGBE)",
    strings: [40, 45, 50, 55, 59, 64],
  },
  bass: {
    id: "bass",
    name: "Bass (EADG)",
    strings: [28, 33, 38, 43],
  },
  ukulele: {
    id: "ukulele",
    name: "Ukulele (GCEA)",
    strings: [55, 60, 64, 69],
  },
  generic: {
    id: "generic",
    name: "Generic",
    strings: [48, 55, 62, 69],
  },
};

export type TabPosition = {
  stringIndex: number;
  fret: number;
};

export const mapPitchToTab = (pitchMidi: number, instrumentId: string): TabPosition => {
  const instrument = INSTRUMENTS[instrumentId] ?? INSTRUMENTS.guitar;
  const choices = instrument.strings
    .map((openPitch, stringIndex) => ({
      stringIndex,
      fret: pitchMidi - openPitch,
    }))
    .filter((choice) => choice.fret >= 0 && choice.fret <= 24);

  if (!choices.length) {
    return { stringIndex: instrument.strings.length - 1, fret: Math.max(0, pitchMidi - instrument.strings.at(-1)!) };
  }

  return choices.reduce((best, current) => {
    if (current.fret < best.fret) {
      return current;
    }
    if (current.fret === best.fret && current.stringIndex > best.stringIndex) {
      return current;
    }
    return best;
  }, choices[0]);
};
