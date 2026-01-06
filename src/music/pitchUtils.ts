export const STAFF_STEP_PX = 12;
export const BOTTOM_LINE_MIDI = 64; // E4

export const pitchToY = (pitchMidi: number, staffBottomY: number) => {
  return staffBottomY - (pitchMidi - BOTTOM_LINE_MIDI) * STAFF_STEP_PX;
};

export const yToPitch = (y: number, staffBottomY: number) => {
  return Math.round(BOTTOM_LINE_MIDI + (staffBottomY - y) / STAFF_STEP_PX);
};

export const quantizeTick = (tick: number, grid: number) => {
  return Math.round(tick / grid) * grid;
};
