import { describe, expect, test } from "vitest";
import { computeLayout } from "../src/utils/layout";
import type { RhythmEvent, TimeSignature } from "../src/utils/types";

const TIME_SIGNATURE: TimeSignature = { beats: 4, beatUnit: 4 };

const buildLayout = (events: RhythmEvent[]) =>
  computeLayout(events, {
    timeSignature: TIME_SIGNATURE,
    ticksPerWhole: 1024,
    xStart: 0,
    measureWidth: 200,
    staffTop: 0,
    staffLineSpacing: 12,
    tabTop: 0,
    tabLineSpacing: 10,
    stemLength: 30,
  });

describe("beaming rules", () => {
  test("groups eighth notes within a beat", () => {
    const events: RhythmEvent[] = [
      {
        id: "n1",
        pitch: "E4",
        string: 1,
        fret: 0,
        baseDuration: "1/8",
        dotted: false,
        tuplet: null,
        isRest: false,
      },
      {
        id: "n2",
        pitch: "F4",
        string: 1,
        fret: 1,
        baseDuration: "1/8",
        dotted: false,
        tuplet: null,
        isRest: false,
      },
      {
        id: "r1",
        baseDuration: "1/8",
        dotted: false,
        tuplet: null,
        isRest: true,
      },
      {
        id: "n3",
        pitch: "G4",
        string: 1,
        fret: 3,
        baseDuration: "1/8",
        dotted: false,
        tuplet: null,
        isRest: false,
      },
    ];

    const layout = buildLayout(events);
    expect(layout.beamGroups).toHaveLength(1);
    expect(layout.beamGroups[0].eventIds).toEqual(["n1", "n2"]);
  });
});
