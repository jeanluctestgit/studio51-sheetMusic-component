import type { MusicalEvent } from "./types";

export const buildExampleEvents = (createId: () => string, ticksPerWhole: number) => {
  const quarter = ticksPerWhole / 4;
  const sixteenth = ticksPerWhole / 16;

  const makeNote = (startTick: number, pitchMidi: number, durationTicks: number): MusicalEvent => ({
    id: createId(),
    type: "note",
    startTick,
    durationTicks,
    pitches: [pitchMidi],
    articulations: [],
    ornaments: [],
    effects: [],
    performanceHints: {},
  });

  const cMajorChord = [
    makeNote(0, 60, quarter),
    makeNote(0, 64, quarter),
    makeNote(0, 67, quarter),
  ];

  const cMajorScale = [60, 62, 64, 65, 67, 69, 71, 72].map((pitch, index) =>
    makeNote(quarter + index * sixteenth, pitch, sixteenth)
  );

  const melodyStart = ticksPerWhole;
  const simpleMelody = [
    makeNote(melodyStart, 64, quarter),
    makeNote(melodyStart + quarter, 62, quarter),
    makeNote(melodyStart + quarter * 2, 60, quarter),
    makeNote(melodyStart + quarter * 3, 55, quarter),
  ];

  return [...cMajorChord, ...cMajorScale, ...simpleMelody];
};
