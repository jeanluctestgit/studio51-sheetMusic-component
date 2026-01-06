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
  systemPaddingBottom: number;
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  staffTop: 50,
  staffLineSpacing: 12,
  tabTop: 130,
  tabLineSpacing: 10,
  measureWidth: 240,
  marginLeft: 80,
  marginTop: 20,
  measuresPerSystem: 3,
  systemPaddingBottom: 40,
};

const TREBLE_BOTTOM_LINE_MIDI = 64; // E4
const BASS_BOTTOM_LINE_MIDI = 43; // G2

export const getClefReference = (clef: "treble" | "bass") =>
  clef === "treble" ? TREBLE_BOTTOM_LINE_MIDI : BASS_BOTTOM_LINE_MIDI;

interface LayoutOptions {
  showTab: boolean;
  stringCount: number;
}

export interface HitTestResult {
  measureIndex: number;
  tick: number;
  staffLine: number | null;
  pitchMidi: number;
  snappedX: number;
  systemIndex: number;
  isTab: boolean;
  tabStringIndex: number | null;
}

export const createLayoutHelpers = (
  layout: LayoutConfig,
  timeSignature: TimeSignature,
  ticksPerWhole: number,
  clef: "treble" | "bass",
  options: LayoutOptions
) => {
  const ticksPerMeasure = measureTicks(timeSignature, ticksPerWhole);
  const { pitchToStaffStep, staffStepToPitch } = createStaffPositioning(getClefReference(clef));
  const bottomLineY = layout.staffTop + layout.staffLineSpacing * 4;
  const staffLinePositions = Array.from({ length: 5 }, (_, index) => layout.staffTop + index * layout.staffLineSpacing);

  const tabHeight = options.showTab ? (options.stringCount - 1) * layout.tabLineSpacing : 0;
  const systemHeight =
    options.showTab
      ? layout.tabTop + tabHeight + layout.systemPaddingBottom
      : layout.staffTop + layout.staffLineSpacing * 4 + layout.systemPaddingBottom;

  const systemTop = (systemIndex: number) => layout.marginTop + systemIndex * systemHeight;

  const getSystemIndexForMeasure = (measureIndex: number) =>
    Math.floor(measureIndex / layout.measuresPerSystem);

  const getSystemIndexForTick = (tick: number) => {
    const measureIndex = Math.floor(tick / ticksPerMeasure);
    return getSystemIndexForMeasure(measureIndex);
  };

  const tickToX = (tick: number) => {
    const measureIndex = Math.floor(tick / ticksPerMeasure);
    const offset = tick - measureIndex * ticksPerMeasure;
    const measureInSystem = measureIndex % layout.measuresPerSystem;
    return layout.marginLeft + measureInSystem * layout.measureWidth + (offset / ticksPerMeasure) * layout.measureWidth;
  };

  const xToTick = (x: number, systemIndex: number) => {
    const relativeX = x - layout.marginLeft;
    const measureInSystem = Math.max(0, Math.floor(relativeX / layout.measureWidth));
    const offsetX = relativeX - measureInSystem * layout.measureWidth;
    return Math.max(
      0,
      Math.round(
        (offsetX / layout.measureWidth) * ticksPerMeasure +
          (systemIndex * layout.measuresPerSystem + measureInSystem) * ticksPerMeasure
      )
    );
  };

  const pitchToY = (midi: number, tick: number) => {
    const systemIndex = getSystemIndexForTick(tick);
    const staffStep = pitchToStaffStep(midi);
    return systemTop(systemIndex) + bottomLineY - staffStep * (layout.staffLineSpacing / 2);
  };

  const yToPitch = (y: number, systemIndex: number) => {
    const localY = y - systemTop(systemIndex);
    const staffStep = Math.round((bottomLineY - localY) / (layout.staffLineSpacing / 2));
    return staffStepToPitch(staffStep);
  };

  const getStaffLinePositions = (systemIndex: number) =>
    staffLinePositions.map((line) => systemTop(systemIndex) + line);

  const getTabLinePositions = (systemIndex: number) =>
    options.showTab
      ? Array.from(
          { length: options.stringCount },
          (_, index) => systemTop(systemIndex) + layout.tabTop + index * layout.tabLineSpacing
        )
      : [];

  const getMeasureBars = (systemIndex: number) =>
    Array.from({ length: layout.measuresPerSystem + 1 }, (_, index) => ({
      x: layout.marginLeft + index * layout.measureWidth,
      systemIndex,
      measureIndex: systemIndex * layout.measuresPerSystem + index,
    }));

  const hitTest = (x: number, y: number, tolerance: { x: number; y: number } = { x: 8, y: 8 }) => {
    const systemIndex = Math.max(0, Math.floor((y - layout.marginTop) / systemHeight));
    const localY = y - systemTop(systemIndex);
    const relativeX = Math.max(0, x - layout.marginLeft);
    const measureInSystem = Math.max(0, Math.floor(relativeX / layout.measureWidth));
    const measureIndex = systemIndex * layout.measuresPerSystem + measureInSystem;
    const offsetX = relativeX - measureInSystem * layout.measureWidth;
    const rawTick = (offsetX / layout.measureWidth) * ticksPerMeasure + measureIndex * ticksPerMeasure;
    const tick = Math.max(0, Math.round(rawTick));

    const staffLineIndex = staffLinePositions.reduce<number | null>((closest, lineY, index) => {
      const distance = Math.abs(lineY - localY);
      if (distance <= tolerance.y && (closest === null || distance < Math.abs(staffLinePositions[closest] - localY))) {
        return index;
      }
      return closest;
    }, null);

    let tabStringIndex: number | null = null;
    if (options.showTab) {
      const tabStart = layout.tabTop - layout.tabLineSpacing;
      const tabEnd = layout.tabTop + (options.stringCount - 1) * layout.tabLineSpacing + layout.tabLineSpacing;
      if (localY >= tabStart && localY <= tabEnd) {
        const rawIndex = Math.round((localY - layout.tabTop) / layout.tabLineSpacing);
        if (rawIndex >= 0 && rawIndex < options.stringCount) {
          tabStringIndex = rawIndex;
        }
      }
    }

    return {
      measureIndex,
      tick,
      staffLine: staffLineIndex,
      pitchMidi: yToPitch(y, systemIndex),
      snappedX: tickToX(tick),
      systemIndex,
      isTab: tabStringIndex !== null,
      tabStringIndex,
    } satisfies HitTestResult;
  };

  return {
    ticksPerMeasure,
    tickToX,
    xToTick,
    pitchToY,
    yToPitch,
    bottomLineY,
    getSystemIndexForTick,
    getSystemIndexForMeasure,
    systemTop,
    systemHeight,
    staffLinePositions,
    getStaffLinePositions,
    getTabLinePositions,
    getMeasureBars,
    hitTest,
  };
};
