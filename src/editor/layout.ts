import { createStaffPositioning } from "../music/pitch";
import type { TimeSignature } from "../music/types";
import { measureTicks } from "../music/ticks";

export interface LayoutConfig {
  staffTop: number;
  staffLineSpacing: number;
  tabTop: number;
  tabLineSpacing: number;
  measureWidth: number;
  marginLeft: number;
  marginTop: number;
  measuresPerSystem: number;
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  staffTop: 80,
  staffLineSpacing: 12,
  tabTop: 170,
  tabLineSpacing: 10,
  measureWidth: 260,
  marginLeft: 80,
  marginTop: 20,
  measuresPerSystem: 2,
};

const TREBLE_BOTTOM_LINE_MIDI = 64; // E4
const BASS_BOTTOM_LINE_MIDI = 43; // G2

export const getClefReference = (clef: "treble" | "bass") =>
  clef === "treble" ? TREBLE_BOTTOM_LINE_MIDI : BASS_BOTTOM_LINE_MIDI;

export const createLayoutHelpers = (
  layout: LayoutConfig,
  timeSignature: TimeSignature,
  ticksPerWhole: number,
  clef: "treble" | "bass"
) => {
  const ticksPerMeasure = measureTicks(timeSignature, ticksPerWhole);
  const { pitchToStaffStep, staffStepToPitch } = createStaffPositioning(getClefReference(clef));
  const bottomLineY = layout.staffTop + layout.staffLineSpacing * 4;
  const staffLinePositions = Array.from({ length: 5 }, (_, index) => layout.staffTop + index * layout.staffLineSpacing);

  const tickToX = (tick: number) => {
    const measureIndex = Math.floor(tick / ticksPerMeasure);
    const offset = tick - measureIndex * ticksPerMeasure;
    return layout.marginLeft + measureIndex * layout.measureWidth + (offset / ticksPerMeasure) * layout.measureWidth;
  };

  const xToTick = (x: number) => {
    const relativeX = x - layout.marginLeft;
    const measureIndex = Math.max(0, Math.floor(relativeX / layout.measureWidth));
    const offsetX = relativeX - measureIndex * layout.measureWidth;
    return Math.max(0, Math.round((offsetX / layout.measureWidth) * ticksPerMeasure + measureIndex * ticksPerMeasure));
  };

  const pitchToY = (midi: number) => {
    const staffStep = pitchToStaffStep(midi);
    return bottomLineY - staffStep * (layout.staffLineSpacing / 2);
  };

  const yToPitch = (y: number) => {
    const staffStep = Math.round((bottomLineY - y) / (layout.staffLineSpacing / 2));
    return staffStepToPitch(staffStep);
  };

  const hitTest = (
    x: number,
    y: number,
    tolerance: { x: number; y: number } = { x: 8, y: 8 }
  ) => {
    const relativeX = Math.max(0, x - layout.marginLeft);
    const measureIndex = Math.max(0, Math.floor(relativeX / layout.measureWidth));
    const offsetX = relativeX - measureIndex * layout.measureWidth;
    const rawTick = (offsetX / layout.measureWidth) * ticksPerMeasure + measureIndex * ticksPerMeasure;
    const tick = Math.max(0, Math.round(rawTick));

    const staffLineIndex = staffLinePositions.reduce<number | null>((closest, lineY, index) => {
      const distance = Math.abs(lineY - y);
      if (distance <= tolerance.y && (closest === null || distance < Math.abs(staffLinePositions[closest] - y))) {
        return index;
      }
      return closest;
    }, null);

    return {
      measureIndex,
      tick,
      staffLine: staffLineIndex,
      pitchMidi: yToPitch(y),
      snappedX: tickToX(tick),
    };
  };

  return {
    ticksPerMeasure,
    tickToX,
    xToTick,
    pitchToY,
    yToPitch,
    bottomLineY,
    staffLinePositions,
    hitTest,
  };
};
