import type { DurationValue, TimeSignature } from "./types";

export const TICKS_PER_WHOLE = 1920;

export interface Tuplet {
  n: number;
  inTimeOf: number;
}

const DURATION_BASE: Record<DurationValue, number> = {
  "1/1": 1,
  "1/2": 1 / 2,
  "1/4": 1 / 4,
  "1/8": 1 / 8,
  "1/16": 1 / 16,
  "1/32": 1 / 32,
};

export const durationToTicks = (
  base: DurationValue,
  dotted: boolean,
  tuplet: Tuplet | null,
  ticksPerWhole: number
) => {
  let ticks = ticksPerWhole * DURATION_BASE[base];
  if (dotted) {
    ticks *= 1.5;
  }
  if (tuplet) {
    ticks *= tuplet.inTimeOf / tuplet.n;
  }
  return Math.round(ticks);
};

export const measureTicks = (timeSignature: TimeSignature, ticksPerWhole: number) => {
  return Math.round((ticksPerWhole * timeSignature.beats) / timeSignature.beatUnit);
};
