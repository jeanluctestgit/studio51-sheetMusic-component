export interface ScaleDefinition {
  id: string;
  name: string;
  intervals: number[];
}

export const SCALES: ScaleDefinition[] = [
  { id: "major", name: "Major", intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: "minor", name: "Minor", intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: "blues", name: "Blues", intervals: [0, 3, 5, 6, 7, 10] },
  { id: "pentatonic", name: "Pentatonic", intervals: [0, 2, 4, 7, 9] },
];

export const scalePitchClasses = (rootMidi: number, scaleId: string | null) => {
  if (!scaleId) {
    return null;
  }
  const scale = SCALES.find((item) => item.id === scaleId);
  if (!scale) {
    return null;
  }
  const rootClass = ((rootMidi % 12) + 12) % 12;
  return new Set(scale.intervals.map((interval) => (rootClass + interval) % 12));
};
