import type { RhythmEvent, TimeSignature } from "./types";
import { toDurationTicks } from "./rhythm";

export type StemDirection = "up" | "down";

export type LayoutCommon = {
  id: string;
  startTick: number;
  durationTicks: number;
  x: number;
  staffY: number;
  tabY: number;
  stemDirection: StemDirection;
  stemLength: number;
  flags: number;
  isRest: boolean;
  tupletLabel?: string;
  beamed: boolean;
};

export type LayoutRestEvent = LayoutCommon & {
  isRest: true;
};

export type LayoutNoteEvent = LayoutCommon & {
  isRest: false;
  string: number;
  fret: number;
  pitch: string;
};

export type LayoutEvent = LayoutNoteEvent | LayoutRestEvent;

export type BeamSegment = {
  level: number;
  xStart: number;
  xEnd: number;
  y: number;
};

export type BeamGroup = {
  id: string;
  eventIds: string[];
  segments: BeamSegment[];
};

export type TupletBracket = {
  id: string;
  startX: number;
  endX: number;
  y: number;
  label: string;
};

export type LayoutResult = {
  events: LayoutEvent[];
  beamGroups: BeamGroup[];
  tupletBrackets: TupletBracket[];
  measureTicks: number;
  ticksPerBeat: number;
  totalTicks: number;
};

export type LayoutOptions = {
  timeSignature: TimeSignature;
  ticksPerWhole?: number;
  xStart: number;
  measureWidth: number;
  staffTop: number;
  staffLineSpacing: number;
  tabTop: number;
  tabLineSpacing: number;
  stemLength: number;
};

const NOTE_LETTER_INDEX: Record<string, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

const parsePitch = (pitch: string): { letter: string; octave: number } | null => {
  const match = pitch.match(/^([A-G])(#|b)?(\d)$/);
  if (!match) {
    return null;
  }
  return { letter: match[1], octave: Number(match[3]) };
};

const getStaffY = (pitch: string, options: LayoutOptions): number => {
  const parsed = parsePitch(pitch);
  const bottomLineY = options.staffTop + options.staffLineSpacing * 4;
  if (!parsed) {
    return bottomLineY - options.staffLineSpacing * 2;
  }
  const reference = { letter: "E", octave: 4 };
  const refIndex = NOTE_LETTER_INDEX[reference.letter];
  const pitchIndex = NOTE_LETTER_INDEX[parsed.letter];
  const diatonicSteps =
    (parsed.octave - reference.octave) * 7 + (pitchIndex - refIndex);
  return bottomLineY - diatonicSteps * (options.staffLineSpacing / 2);
};

const getTabY = (stringIndex: number, options: LayoutOptions): number => {
  const clamped = Math.min(Math.max(stringIndex, 1), 6);
  return options.tabTop + (clamped - 1) * options.tabLineSpacing;
};

const getRestStaffY = (options: LayoutOptions): number =>
  options.staffTop + options.staffLineSpacing * 2;

const getRestTabY = (options: LayoutOptions): number =>
  options.tabTop + options.tabLineSpacing * 2;

const getStemDirection = (staffY: number, options: LayoutOptions): StemDirection => {
  const middleLineY = options.staffTop + options.staffLineSpacing * 2;
  return staffY < middleLineY ? "down" : "up";
};

const buildTupletBrackets = (events: LayoutEvent[]): TupletBracket[] => {
  const brackets: TupletBracket[] = [];
  let current: { ids: string[]; label: string } | null = null;

  events.forEach((event) => {
    const label = event.tupletLabel ?? null;
    if (!label) {
      if (current) {
        const slice = current.ids.map(
          (id) => events.find((item) => item.id === id) ?? null
        );
        const filtered = slice.filter(Boolean) as LayoutEvent[];
        if (filtered.length >= 2) {
          brackets.push({
            id: `tuplet-${current.label}-${filtered[0].id}`,
            startX: filtered[0].x - 8,
            endX: filtered[filtered.length - 1].x + 8,
            y: Math.min(...filtered.map((item) => item.staffY)) - 46,
            label: current.label,
          });
        }
        current = null;
      }
      return;
    }

    if (!current || current.label !== label) {
      if (current) {
        const slice = current.ids.map(
          (id) => events.find((item) => item.id === id) ?? null
        );
        const filtered = slice.filter(Boolean) as LayoutEvent[];
        if (filtered.length >= 2) {
          brackets.push({
            id: `tuplet-${current.label}-${filtered[0].id}`,
            startX: filtered[0].x - 8,
            endX: filtered[filtered.length - 1].x + 8,
            y: Math.min(...filtered.map((item) => item.staffY)) - 46,
            label: current.label,
          });
        }
      }
      current = { ids: [event.id], label };
    } else {
      current.ids.push(event.id);
    }
  });

  if (current) {
    const slice = current.ids.map(
      (id) => events.find((item) => item.id === id) ?? null
    );
    const filtered = slice.filter(Boolean) as LayoutEvent[];
    if (filtered.length >= 2) {
      brackets.push({
        id: `tuplet-${current.label}-${filtered[0].id}`,
        startX: filtered[0].x - 8,
        endX: filtered[filtered.length - 1].x + 8,
        y: Math.min(...filtered.map((item) => item.staffY)) - 46,
        label: current.label,
      });
    }
  }

  return brackets;
};

export const computeBeamGroups = (
  events: LayoutEvent[],
  ticksPerBeat: number,
  measureTicks: number
): BeamGroup[] => {
  const groups: BeamGroup[] = [];
  const eventsByMeasure: Record<number, LayoutEvent[]> = {};

  events.forEach((event) => {
    const measureIndex = Math.floor(event.startTick / measureTicks);
    if (!eventsByMeasure[measureIndex]) {
      eventsByMeasure[measureIndex] = [];
    }
    eventsByMeasure[measureIndex].push(event);
  });

  Object.values(eventsByMeasure).forEach((measureEvents) => {
    const beats: Record<number, LayoutEvent[]> = {};
    measureEvents.forEach((event) => {
      const beatIndex = Math.floor((event.startTick % measureTicks) / ticksPerBeat);
      if (!beats[beatIndex]) {
        beats[beatIndex] = [];
      }
      beats[beatIndex].push(event);
    });

    Object.values(beats).forEach((beatEvents) => {
      beatEvents.sort((a, b) => a.startTick - b.startTick);
      let currentGroup: LayoutEvent[] = [];

      const flushGroup = () => {
        if (currentGroup.length >= 2) {
          const eventIds = currentGroup.map((item) => item.id);
          const maxFlags = Math.max(...currentGroup.map((item) => item.flags));
          const segments: BeamSegment[] = [];
          const pushSegment = (
            segmentStart: LayoutEvent,
            segmentEnd: LayoutEvent,
            level: number
          ) => {
            const direction = segmentStart.stemDirection;
            const stemY =
              direction === "up"
                ? Math.min(segmentStart.staffY, segmentEnd.staffY) -
                  segmentStart.stemLength
                : Math.max(segmentStart.staffY, segmentEnd.staffY) +
                  segmentStart.stemLength;
            const xStart = segmentStart.x;
            const xEnd =
              segmentEnd.id === segmentStart.id
                ? segmentStart.x + (direction === "up" ? 10 : -10)
                : segmentEnd.x;
            segments.push({
              level,
              xStart,
              xEnd,
              y: stemY + (direction === "up" ? -(level - 1) * 6 : (level - 1) * 6),
            });
          };
          for (let level = 1; level <= maxFlags; level += 1) {
            let segmentStart: LayoutEvent | null = null;
            let previous: LayoutEvent | null = null;

            currentGroup.forEach((event) => {
              if (event.flags >= level) {
                if (!segmentStart) {
                  segmentStart = event;
                }
                previous = event;
              } else if (segmentStart && previous) {
                pushSegment(segmentStart, previous, level);
                segmentStart = null;
                previous = null;
              }
            });

            if (segmentStart && previous) {
              pushSegment(segmentStart, previous, level);
            }
          }

          groups.push({
            id: `beam-${currentGroup[0].id}`,
            eventIds,
            segments,
          });
        }
        currentGroup = [];
      };

      beatEvents.forEach((event) => {
        if (event.isRest) {
          flushGroup();
          return;
        }

        if (event.flags === 0) {
          flushGroup();
          return;
        }

        currentGroup.push(event);
      });

      flushGroup();
    });
  });

  return groups;
};

export const computeLayout = (
  events: RhythmEvent[],
  options: LayoutOptions
): LayoutResult => {
  const ticksPerWhole = options.ticksPerWhole ?? 1024;
  const measureTicks =
    (ticksPerWhole * options.timeSignature.beats) / options.timeSignature.beatUnit;
  const ticksPerBeat = ticksPerWhole / options.timeSignature.beatUnit;

  let cumulativeTicks = 0;
  const getFlagCountForTicks = (durationTicks: number): number => {
    if (durationTicks <= ticksPerWhole / 32) {
      return 3;
    }
    if (durationTicks <= ticksPerWhole / 16) {
      return 2;
    }
    if (durationTicks < ticksPerWhole / 4) {
      return 1;
    }
    return 0;
  };
  const layoutEvents: LayoutEvent[] = events.map((event) => {
    const durationTicks = toDurationTicks(
      event.baseDuration,
      event.dotted,
      event.tuplet,
      ticksPerWhole
    );
    const startTick = cumulativeTicks;
    cumulativeTicks += durationTicks;

    const x =
      options.xStart + (startTick / measureTicks) * options.measureWidth;
    const flags = getFlagCountForTicks(durationTicks);
    const tupletLabel = event.tuplet
      ? `${event.tuplet.n}:${event.tuplet.inTimeOf}`
      : undefined;

    if (event.isRest) {
      const staffY = getRestStaffY(options);
      const tabY = getRestTabY(options);
      return {
        id: event.id,
        startTick,
        durationTicks,
        x,
        staffY,
        tabY,
        stemDirection: getStemDirection(staffY, options),
        stemLength: options.stemLength,
        flags,
        isRest: true,
        tupletLabel,
        beamed: false,
      };
    }

    const staffY = getStaffY(event.pitch, options);
    const tabY = getTabY(event.string, options);
    return {
      id: event.id,
      startTick,
      durationTicks,
      x,
      staffY,
      tabY,
      stemDirection: getStemDirection(staffY, options),
      stemLength: options.stemLength,
      flags,
      isRest: false,
      tupletLabel,
      string: event.string,
      fret: event.fret,
      pitch: event.pitch,
      beamed: false,
    };
  });

  const beamGroups = computeBeamGroups(layoutEvents, ticksPerBeat, measureTicks);
  const beamedIds = new Set(beamGroups.flatMap((group) => group.eventIds));

  const updatedEvents = layoutEvents.map((event) => ({
    ...event,
    beamed: beamedIds.has(event.id),
  }));

  const tupletBrackets = buildTupletBrackets(updatedEvents);

  return {
    events: updatedEvents,
    beamGroups,
    tupletBrackets,
    measureTicks,
    ticksPerBeat,
    totalTicks: cumulativeTicks,
  };
};
