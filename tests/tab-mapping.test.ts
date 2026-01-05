import { describe, expect, test } from "vitest";
import { getInstrumentById } from "../src/music/instruments";
import { createTabContext, mapChordToTab, mapNoteToTab, mapNotesToTabPositions } from "../src/music/mapping";

describe("tab mapping", () => {
  const guitar = getInstrumentById("guitar-standard");

  test("maps a single note to the lowest fret option", () => {
    const context = createTabContext();
    const mapped = mapNoteToTab({ pitchMidi: 60 }, guitar, context);

    expect(mapped).not.toBeNull();
    expect(mapped?.strings[0]).toBe(2);
    expect(mapped?.frets[0]).toBe(5);
  });

  test("maps a C major chord with unique strings and a tight span", () => {
    const context = createTabContext();
    const chordNotes = [
      { id: "c4", pitchMidi: 60 },
      { id: "e4", pitchMidi: 64 },
      { id: "g4", pitchMidi: 67 },
    ];

    const positions = mapChordToTab(chordNotes, guitar, context);
    const values = [...positions.values()];

    expect(values).toHaveLength(3);

    const strings = values.map((pos) => pos.strings[0]);
    expect(new Set(strings).size).toBe(3);

    const frets = values.map((pos) => pos.frets[0]);
    const span = Math.max(...frets) - Math.min(...frets);
    expect(span).toBeLessThanOrEqual(5);
  });

  test("groups notes by tick when mapping a sequence", () => {
    const positions = mapNotesToTabPositions(
      [
        { id: "c4", pitchMidi: 60, startTick: 0 },
        { id: "e4", pitchMidi: 64, startTick: 0 },
        { id: "g4", pitchMidi: 67, startTick: 0 },
        { id: "a3", pitchMidi: 57, startTick: 480 },
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
