const NATURAL_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const DIATONIC_FROM_PC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

export interface PitchInfo {
  midi: number;
  staffStep: number;
  accidental: "#" | "b" | "natural" | null;
}

export const midiToPitchInfo = (midi: number) => {
  const pitchClass = ((midi % 12) + 12) % 12;
  const diatonic = DIATONIC_FROM_PC[pitchClass];
  const naturalSemitone = NATURAL_SEMITONES[diatonic];
  const accidental = pitchClass === naturalSemitone ? "natural" : pitchClass > naturalSemitone ? "#" : "b";
  const octave = Math.floor(midi / 12) - 1;
  const staffStep = octave * 7 + diatonic;

  return {
    midi,
    staffStep,
    accidental: accidental === "natural" ? null : accidental,
  } satisfies PitchInfo;
};

export const staffStepToMidi = (staffStep: number) => {
  const octave = Math.floor(staffStep / 7);
  const diatonic = ((staffStep % 7) + 7) % 7;
  const semitone = NATURAL_SEMITONES[diatonic];
  return (octave + 1) * 12 + semitone;
};

export const createStaffPositioning = (bottomLineMidi: number) => {
  const referenceStep = midiToPitchInfo(bottomLineMidi).staffStep;

  const pitchToStaffStep = (midi: number) => midiToPitchInfo(midi).staffStep - referenceStep;

  const staffStepToPitch = (step: number) => staffStepToMidi(step + referenceStep);

  return { pitchToStaffStep, staffStepToPitch };
};
