import { describe, expect, test } from "vitest";
import { useScoreStore } from "../src/store/scoreStore";
import type { Score } from "../src/music/types";

const buildScore = (): Score => ({
  id: "score-undo",
  title: "Undo",
  ticksPerQuarter: 480,
  tracks: [
    {
      id: "track-undo",
      name: "Generic",
      instrumentId: "guitar",
      measures: [
        {
          id: "measure-undo",
          timeSignature: { beats: 4, beatUnit: 4 },
          voices: [
            {
              id: "voice-undo",
              events: [],
            },
          ],
        },
      ],
    },
  ],
});

describe("undo/redo", () => {
  test("undoes and redoes a note insertion", () => {
    const store = useScoreStore.getState();
    store.importScore(buildScore());
    store.setCaret(0, 60);
    store.setActiveDurationTicks(480);
    store.insertNoteAtCaret();

    let events = useScoreStore.getState().score.tracks[0].measures[0].voices[0].events;
    expect(events).toHaveLength(1);

    store.undo();
    events = useScoreStore.getState().score.tracks[0].measures[0].voices[0].events;
    expect(events).toHaveLength(0);

    store.redo();
    events = useScoreStore.getState().score.tracks[0].measures[0].voices[0].events;
    expect(events).toHaveLength(1);
  });
});
