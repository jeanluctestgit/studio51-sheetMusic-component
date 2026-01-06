import { create } from "zustand";
import { Score, NoteEvent, ScoreEvent, ToolId } from "../music/types";
import { INSTRUMENTS } from "../music/mapping";

const STORAGE_KEY = "stafffirst-score";
const TICKS_PER_QUARTER = 480;

const createId = () => `id-${Math.random().toString(36).slice(2, 10)}`;

const createDefaultScore = (): Score => ({
  id: "score-1",
  title: "Untitled",
  ticksPerQuarter: TICKS_PER_QUARTER,
  tracks: [
    {
      id: "track-1",
      name: "Guitar",
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

const cloneScore = (score: Score): Score => JSON.parse(JSON.stringify(score));

export type Caret = {
  tick: number;
  pitchMidi: number;
};

export type HistorySnapshot = {
  score: Score;
  selection: string[];
  caret: Caret;
};

export type ScoreState = {
  score: Score;
  caret: Caret;
  selection: string[];
  activeTool: ToolId;
  activeDurationTicks: number;
  history: {
    past: HistorySnapshot[];
    future: HistorySnapshot[];
  };
  setTool: (tool: ToolId) => void;
  setActiveDurationTicks: (ticks: number) => void;
  setCaret: (tick: number, pitchMidi: number) => void;
  moveCaret: (deltaTicks: number, deltaPitch: number) => void;
  insertNoteAtCaret: () => void;
  insertRestAtCaret: () => void;
  removeEvent: (id: string) => void;
  removeSelected: () => void;
  selectSingle: (id: string | null) => void;
  toggleSelection: (id: string) => void;
  moveEvent: (id: string, deltaTicks: number, deltaPitch: number) => void;
  undo: () => void;
  redo: () => void;
  exportScore: () => string;
  importScore: (score: Score) => void;
  setInstrument: (instrumentId: string) => void;
  getEventById: (id: string) => ScoreEvent | undefined;
};

const getInitialScore = () => {
  if (typeof window === "undefined") {
    return createDefaultScore();
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return createDefaultScore();
  }
  try {
    return JSON.parse(stored) as Score;
  } catch {
    return createDefaultScore();
  }
};

export const useScoreStore = create<ScoreState>((set, get) => ({
  score: getInitialScore(),
  caret: { tick: 0, pitchMidi: 64 },
  selection: [],
  activeTool: "note",
  activeDurationTicks: TICKS_PER_QUARTER,
  history: { past: [], future: [] },
  setTool: (tool) => set({ activeTool: tool }),
  setActiveDurationTicks: (ticks) => set({ activeDurationTicks: ticks }),
  setCaret: (tick, pitchMidi) =>
    set(() => ({
      caret: {
        tick: Math.max(0, tick),
        pitchMidi: Math.min(96, Math.max(36, pitchMidi)),
      },
    })),
  moveCaret: (deltaTicks, deltaPitch) => {
    const { caret } = get();
    set(() => ({
      caret: {
        tick: Math.max(0, caret.tick + deltaTicks),
        pitchMidi: Math.min(96, Math.max(36, caret.pitchMidi + deltaPitch)),
      },
    }));
  },
  insertNoteAtCaret: () => {
    const { score, caret, activeDurationTicks, history, selection } = get();
    const newScore = cloneScore(score);
    const voice = newScore.tracks[0].measures[0].voices[0];
    const note: NoteEvent = {
      id: createId(),
      type: "note",
      startTick: caret.tick,
      durationTicks: activeDurationTicks,
      pitchMidi: caret.pitchMidi,
      articulations: [],
      effects: [],
    };
    voice.events.push(note);
    voice.events.sort((a, b) => a.startTick - b.startTick);
    const snapshot: HistorySnapshot = {
      score: cloneScore(score),
      selection: [...selection],
      caret: { ...caret },
    };
    set({
      score: newScore,
      caret: { ...caret, tick: caret.tick + activeDurationTicks },
      selection: [note.id],
      history: { past: [...history.past, snapshot], future: [] },
    });
  },
  insertRestAtCaret: () => {
    const { score, caret, activeDurationTicks, history, selection } = get();
    const newScore = cloneScore(score);
    const voice = newScore.tracks[0].measures[0].voices[0];
    const rest: ScoreEvent = {
      id: createId(),
      type: "rest",
      startTick: caret.tick,
      durationTicks: activeDurationTicks,
    };
    voice.events.push(rest);
    voice.events.sort((a, b) => a.startTick - b.startTick);
    const snapshot: HistorySnapshot = {
      score: cloneScore(score),
      selection: [...selection],
      caret: { ...caret },
    };
    set({
      score: newScore,
      caret: { ...caret, tick: caret.tick + activeDurationTicks },
      selection: [rest.id],
      history: { past: [...history.past, snapshot], future: [] },
    });
  },
  removeEvent: (id) => {
    const { score, history, selection, caret } = get();
    const newScore = cloneScore(score);
    const voice = newScore.tracks[0].measures[0].voices[0];
    const nextEvents = voice.events.filter((event) => event.id !== id);
    if (nextEvents.length === voice.events.length) {
      return;
    }
    voice.events = nextEvents;
    const snapshot: HistorySnapshot = {
      score: cloneScore(score),
      selection: [...selection],
      caret: { ...caret },
    };
    set({
      score: newScore,
      selection: selection.filter((selectedId) => selectedId !== id),
      history: { past: [...history.past, snapshot], future: [] },
    });
  },
  removeSelected: () => {
    const { selection } = get();
    selection.forEach((id) => get().removeEvent(id));
  },
  selectSingle: (id) => {
    set({ selection: id ? [id] : [] });
  },
  toggleSelection: (id) => {
    const { selection } = get();
    if (selection.includes(id)) {
      set({ selection: selection.filter((item) => item !== id) });
      return;
    }
    set({ selection: [...selection, id] });
  },
  moveEvent: (id, deltaTicks, deltaPitch) => {
    const { score, history, selection, caret } = get();
    const newScore = cloneScore(score);
    const voice = newScore.tracks[0].measures[0].voices[0];
    const event = voice.events.find((item) => item.id === id);
    if (!event) {
      return;
    }
    const snapshot: HistorySnapshot = {
      score: cloneScore(score),
      selection: [...selection],
      caret: { ...caret },
    };
    event.startTick = Math.max(0, event.startTick + deltaTicks);
    if (event.type === "note") {
      event.pitchMidi = Math.min(96, Math.max(36, event.pitchMidi + deltaPitch));
    }
    voice.events.sort((a, b) => a.startTick - b.startTick);
    set({
      score: newScore,
      history: { past: [...history.past, snapshot], future: [] },
    });
  },
  undo: () => {
    const { history, score, selection, caret } = get();
    const previous = history.past.at(-1);
    if (!previous) {
      return;
    }
    const newPast = history.past.slice(0, -1);
    const futureSnapshot: HistorySnapshot = {
      score: cloneScore(score),
      selection: [...selection],
      caret: { ...caret },
    };
    set({
      score: cloneScore(previous.score),
      selection: [...previous.selection],
      caret: { ...previous.caret },
      history: { past: newPast, future: [futureSnapshot, ...history.future] },
    });
  },
  redo: () => {
    const { history, score, selection, caret } = get();
    const next = history.future[0];
    if (!next) {
      return;
    }
    const futureRemainder = history.future.slice(1);
    const pastSnapshot: HistorySnapshot = {
      score: cloneScore(score),
      selection: [...selection],
      caret: { ...caret },
    };
    set({
      score: cloneScore(next.score),
      selection: [...next.selection],
      caret: { ...next.caret },
      history: { past: [...history.past, pastSnapshot], future: futureRemainder },
    });
  },
  exportScore: () => {
    return JSON.stringify(get().score, null, 2);
  },
  importScore: (score) => {
    const { history, selection, caret } = get();
    const snapshot: HistorySnapshot = {
      score: cloneScore(get().score),
      selection: [...selection],
      caret: { ...caret },
    };
    set({
      score: cloneScore(score),
      selection: [],
      caret: { tick: 0, pitchMidi: 64 },
      history: { past: [...history.past, snapshot], future: [] },
    });
  },
  setInstrument: (instrumentId) => {
    const { score, history, selection, caret } = get();
    if (!INSTRUMENTS[instrumentId]) {
      return;
    }
    const newScore = cloneScore(score);
    newScore.tracks[0].instrumentId = instrumentId;
    const snapshot: HistorySnapshot = {
      score: cloneScore(score),
      selection: [...selection],
      caret: { ...caret },
    };
    set({
      score: newScore,
      history: { past: [...history.past, snapshot], future: [] },
    });
  },
  getEventById: (id) => {
    const voice = get().score.tracks[0].measures[0].voices[0];
    return voice.events.find((event) => event.id === id);
  },
}));

if (typeof window !== "undefined") {
  useScoreStore.subscribe((state) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.score));
  });
}
