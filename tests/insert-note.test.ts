import { describe, expect, test } from "vitest";
import { useEditorStore } from "../src/editor/store";
import type { Score } from "../src/music/types";

const buildScore = (): Score => ({
  id: "score-1",
  title: "Test",
  timeSignature: { beats: 4, beatUnit: 4 },
  keySignature: "C",
  ticksPerWhole: 1024,
  tracks: [
    {
      id: "track-1",
      name: "Generic",
      clef: "treble",
      instrumentId: "generic",
      showTab: false,
      measures: [
        {
          id: "measure-1",
          index: 0,
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

describe("insertion note", () => {
  test("adds a note event at caret", () => {
    const store = useEditorStore.getState();
    store.importScore(buildScore());
    store.setDuration("1/4");
    store.addNoteAt(0, 64);

    const updated = useEditorStore.getState().score;
    const events = updated.tracks[0].measures[0].voices[0].events;
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("note");
    if (events[0].type === "note") {
      expect(events[0].pitchMidi).toBe(64);
      expect(events[0].durationTicks).toBe(256);
    }
  });
});
