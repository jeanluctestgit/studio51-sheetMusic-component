import { describe, expect, test } from "vitest";
import { useScoreStore } from "../src/store/scoreStore";
import type { Score } from "../src/music/types";

const buildScore = (): Score => ({
  id: "score-1",
  title: "Test",
  ticksPerQuarter: 480,
  tracks: [
    {
      id: "track-1",
      name: "Generic",
      instrumentId: "guitar",
      measures: [
        {
          id: "measure-1",
          timeSignature: { beats: 4, beatUnit: 4 },
          voices: [
            {
              id: "voice-1",
              events: [],
            },
          ],
        },
      ],
    },
  ],
});

describe("note insertion", () => {
  test("adds a note event at caret", () => {
    const store = useScoreStore.getState();
    store.importScore(buildScore());
    store.setCaret(0, 64);
    store.setActiveDurationTicks(480);
    store.insertNoteAtCaret();

    const updated = useScoreStore.getState().score;
    const events = updated.tracks[0].measures[0].voices[0].events;
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("note");
    if (events[0].type === "note") {
      expect(events[0].pitchMidi).toBe(64);
      expect(events[0].durationTicks).toBe(480);
    }
  });
});
