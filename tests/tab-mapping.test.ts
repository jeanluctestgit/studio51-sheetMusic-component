import { describe, expect, test } from "vitest";
import { getInstrumentById } from "../src/music/instruments";
import { mapEventsToTabPositions, mapPitchToTab } from "../src/music/mapping";

describe("tab mapping", () => {
  const guitar = getInstrumentById("guitar-standard");

  test("maps a single note to the lowest fret option", () => {
    const mapped = mapPitchToTab(60, guitar);

    expect(mapped).not.toBeNull();
    expect(mapped?.strings[0]).toBe(2);
    expect(mapped?.frets[0]).toBe(5);
  });

  test("maps a C major chord with unique strings and a tight span", () => {
    const positions = mapEventsToTabPositions(
      [
        { id: "c4", pitches: [60], startTick: 0, performanceHints: {} },
        { id: "e4", pitches: [64], startTick: 0, performanceHints: {} },
        { id: "g4", pitches: [67], startTick: 0, performanceHints: {} },
      ],
      guitar
    );

    const values = [...positions.values()];
    expect(values).toHaveLength(3);

    const strings = values.map((pos) => pos.strings[0]);
    expect(new Set(strings).size).toBe(3);

    const frets = values.map((pos) => pos.frets[0]);
    const span = Math.max(...frets) - Math.min(...frets);
    expect(span).toBeLessThanOrEqual(5);
  });

  test("groups notes by tick when mapping a sequence", () => {
    const positions = mapEventsToTabPositions(
      [
        { id: "c4", pitches: [60], startTick: 0, performanceHints: {} },
        { id: "e4", pitches: [64], startTick: 0, performanceHints: {} },
        { id: "g4", pitches: [67], startTick: 0, performanceHints: {} },
        { id: "a3", pitches: [57], startTick: 480, performanceHints: {} },
      ],
      guitar
    );

    expect(positions.size).toBe(4);
    const chordStrings = [
      positions.get("c4")?.strings[0],
      positions.get("e4")?.strings[0],
      positions.get("g4")?.strings[0],
    ];
    expect(new Set(chordStrings).size).toBe(3);
  });
});
