import type { Clef } from "./types";

export type InstrumentCategory = "generic" | "guitar" | "bass" | "ukulele";

export interface InstrumentDefinition {
  id: string;
  name: string;
  category: InstrumentCategory;
  clef: Clef;
  strings: number[] | null;
}

export const INSTRUMENTS: InstrumentDefinition[] = [
  {
    id: "generic",
    name: "Generic",
    category: "generic",
    clef: "treble",
    strings: null,
  },
  {
    id: "guitar-standard",
    name: "Guitar (standard)",
    category: "guitar",
    clef: "treble",
    strings: [64, 59, 55, 50, 45, 40],
  },
  {
    id: "bass-standard",
    name: "Bass (standard)",
    category: "bass",
    clef: "bass",
    strings: [43, 38, 33, 28],
  },
  {
    id: "ukulele-standard",
    name: "Ukulele (standard)",
    category: "ukulele",
    clef: "treble",
    strings: [69, 64, 60, 67],
  },
];

export const getInstrumentById = (instrumentId: string | null) => {
  return INSTRUMENTS.find((instrument) => instrument.id === instrumentId) ?? INSTRUMENTS[0];
};
