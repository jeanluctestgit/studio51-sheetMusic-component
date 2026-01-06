import { describe, expect, test } from "vitest";
import { useEditorStore } from "../src/state/editorStore";
import type { Score } from "../src/music/types";

const buildScore = (): Score => ({
  id: "score-undo",
  title: "Undo",
  tempoBpm: 120,
  timeSignature: { beats: 4, beatUnit: 4 },
  keySignature: "C",
  ticksPerWhole: 1024,
  tracks: [
    {
      id: "track-undo",
      name: "Generic",
      clef: "treble",
      instrumentId: "generic",
      showTab: false,
      measures: [
        {
          id: "measure-undo",
          index: 0,
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
    const store = useEditorStore.getState();
    store.importScore(buildScore());
    store.setDuration("1/4");
    store.addNoteAt({ tick: 0, pitchMidi: 60 });

    let events = useEditorStore.getState().score.tracks[0].measures[0].voices[0].events;
    expect(events).toHaveLength(1);

    store.undo();
    events = useEditorStore.getState().score.tracks[0].measures[0].voices[0].events;
    expect(events).toHaveLength(0);

    store.redo();
    events = useEditorStore.getState().score.tracks[0].measures[0].voices[0].events;
    expect(events).toHaveLength(1);
  });
});
