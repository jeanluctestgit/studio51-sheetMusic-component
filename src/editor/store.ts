import { create } from "zustand";
import type {
  Articulation,
  ChordSymbolEvent,
  Effect,
  KeySignature,
  NoteEvent,
  Ornament,
  RestEvent,
  Score,
  ScoreEvent,
  ToolId,
  Track,
  TimeSignature,
} from "../music/types";
import { durationToTicks, measureTicks, TICKS_PER_WHOLE } from "../music/ticks";
import { quantizeTick } from "../music/quantize";
import { getInstrumentById } from "../music/instruments";

const STORAGE_KEY = "studio51-score";
const HISTORY_LIMIT = 50;

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const buildInitialScore = (): Score => ({
  id: createId(),
  title: "Staff-first prototype",
  timeSignature: { beats: 4, beatUnit: 4 },
  keySignature: "C",
  ticksPerWhole: TICKS_PER_WHOLE,
  tracks: [
    {
      id: createId(),
      name: "Generic",
      clef: "treble",
      instrumentId: "generic",
      showTab: false,
      measures: Array.from({ length: 4 }, (_, index) => ({
        id: createId(),
        index,
        voices: [
          {
            id: createId(),
            events: [],
          },
        ],
      })),
    },
  ],
});

const loadInitialScore = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return buildInitialScore();
  }
  const parsed = JSON.parse(raw) as Score;
  return parsed;
};

const cloneScore = (score: Score) => structuredClone(score);

export interface EditorState {
  score: Score;
  history: Score[];
  historyIndex: number;
  activeTool: ToolId;
  duration: "1/1" | "1/2" | "1/4" | "1/8" | "1/16" | "1/32";
  dotted: boolean;
  triplet: boolean;
  caretTick: number;
  selectedEventIds: string[];
  selectedTrackId: string;
  activeArticulations: Articulation[];
  activeOrnaments: Ornament[];
  activeEffects: Effect[];
  activeScaleId: string | null;
  scaleRootMidi: number;
  setTool: (tool: ToolId) => void;
  setDuration: (duration: EditorState["duration"]) => void;
  toggleDotted: () => void;
  toggleTriplet: () => void;
  setCaretTick: (tick: number) => void;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  addNoteAt: (tick: number, pitchMidi: number) => void;
  addRestAt: (tick: number) => void;
  addChordSymbol: (tick: number, symbol: string) => void;
  removeEvent: (id: string) => void;
  moveSelected: (deltaTicks: number, deltaPitch: number) => void;
  updateEvent: (event: ScoreEvent) => void;
  setTimeSignature: (timeSignature: TimeSignature) => void;
  setKeySignature: (keySignature: KeySignature) => void;
  setTrackInstrument: (trackId: string, instrumentId: string) => void;
  toggleTrackTab: (trackId: string) => void;
  toggleArticulation: (value: Articulation) => void;
  toggleOrnament: (value: Ornament) => void;
  toggleEffect: (value: Effect) => void;
  setScale: (scaleId: string | null) => void;
  setScaleRoot: (midi: number) => void;
  undo: () => void;
  redo: () => void;
  importScore: (score: Score) => void;
}

const applyHistory = (state: EditorState, score: Score): Pick<EditorState, "score" | "history" | "historyIndex"> => {
  const nextHistory = state.history.slice(0, state.historyIndex + 1);
  nextHistory.push(cloneScore(score));
  if (nextHistory.length > HISTORY_LIMIT) {
    nextHistory.shift();
  }
  return {
    score,
    history: nextHistory,
    historyIndex: nextHistory.length - 1,
  };
};

const updateTrack = (score: Score, trackId: string, updater: (track: Track) => Track) => {
  return {
    ...score,
    tracks: score.tracks.map((track) => (track.id === trackId ? updater(track) : track)),
  };
};

const insertEvent = (track: Track, event: ScoreEvent, ticksPerMeasure: number) => {
  const measureIndex = Math.floor(event.startTick / ticksPerMeasure);
  const measures = track.measures.map((measure, index) =>
    index === measureIndex
      ? {
          ...measure,
          voices: measure.voices.map((voice, voiceIndex) =>
            voiceIndex === 0
              ? {
                  ...voice,
                  events: [...voice.events, event].sort((a, b) => a.startTick - b.startTick),
                }
              : voice
          ),
        }
      : measure
  );

  if (!measures[measureIndex]) {
    const padding = Array.from({ length: measureIndex - measures.length + 1 }, (_, idx) => ({
      id: createId(),
      index: measures.length + idx,
      voices: [
        {
          id: createId(),
          events: [],
        },
      ],
    }));

    const updated = [...measures, ...padding];
    const updatedMeasure = updated[measureIndex];
    updated[measureIndex] = {
      ...updatedMeasure,
      voices: updatedMeasure.voices.map((voice, voiceIndex) =>
        voiceIndex === 0
          ? {
              ...voice,
              events: [...voice.events, event].sort((a, b) => a.startTick - b.startTick),
            }
          : voice
      ),
    };
    return {
      ...track,
      measures: updated,
    };
  }

  return {
    ...track,
    measures,
  };
};

export const useEditorStore = create<EditorState>((set, get) => {
  const initialScore = loadInitialScore();

  return {
    score: initialScore,
    history: [cloneScore(initialScore)],
    historyIndex: 0,
    activeTool: "select",
    duration: "1/4",
    dotted: false,
    triplet: false,
    caretTick: 0,
    selectedEventIds: [],
    selectedTrackId: initialScore.tracks[0].id,
    activeArticulations: [],
    activeOrnaments: [],
    activeEffects: [],
    activeScaleId: null,
    scaleRootMidi: 60,
    setTool: (tool) => set({ activeTool: tool }),
    setDuration: (duration) => set({ duration }),
    toggleDotted: () => set((state) => ({ dotted: !state.dotted })),
    toggleTriplet: () => set((state) => ({ triplet: !state.triplet })),
    setCaretTick: (tick) => set({ caretTick: tick }),
    setSelection: (ids) => set({ selectedEventIds: ids }),
    toggleSelection: (id) =>
      set((state) => ({
        selectedEventIds: state.selectedEventIds.includes(id)
          ? state.selectedEventIds.filter((item) => item !== id)
          : [...state.selectedEventIds, id],
      })),
    addNoteAt: (tick, pitchMidi) => {
      const state = get();
      const ticksPerMeasure = measureTicks(state.score.timeSignature, state.score.ticksPerWhole);
      const durationTicks = durationToTicks(
        state.duration,
        state.dotted,
        state.triplet ? { n: 3, inTimeOf: 2 } : null,
        state.score.ticksPerWhole
      );
      const quantized = quantizeTick(tick, durationTicks);
      const note: NoteEvent = {
        id: createId(),
        type: "note",
        startTick: quantized,
        durationTicks,
        pitchMidi,
        articulations: [...state.activeArticulations],
        ornaments: [...state.activeOrnaments],
        effects: [...state.activeEffects],
      };

      const score = updateTrack(state.score, state.selectedTrackId, (track) =>
        insertEvent(track, note, ticksPerMeasure)
      );
      set((prev) => ({
        ...applyHistory(prev, score),
        caretTick: quantized + durationTicks,
        selectedEventIds: [note.id],
      }));
    },
    addRestAt: (tick) => {
      const state = get();
      const ticksPerMeasure = measureTicks(state.score.timeSignature, state.score.ticksPerWhole);
      const durationTicks = durationToTicks(
        state.duration,
        state.dotted,
        state.triplet ? { n: 3, inTimeOf: 2 } : null,
        state.score.ticksPerWhole
      );
      const quantized = quantizeTick(tick, durationTicks);
      const rest: RestEvent = {
        id: createId(),
        type: "rest",
        startTick: quantized,
        durationTicks,
      };

      const score = updateTrack(state.score, state.selectedTrackId, (track) =>
        insertEvent(track, rest, ticksPerMeasure)
      );
      set((prev) => ({
        ...applyHistory(prev, score),
        caretTick: quantized + durationTicks,
        selectedEventIds: [rest.id],
      }));
    },
    addChordSymbol: (tick, symbol) => {
      const state = get();
      if (!symbol.trim()) {
        return;
      }
      const ticksPerMeasure = measureTicks(state.score.timeSignature, state.score.ticksPerWhole);
      const chord: ChordSymbolEvent = {
        id: createId(),
        type: "chord",
        startTick: tick,
        symbol,
      };
      const score = updateTrack(state.score, state.selectedTrackId, (track) =>
        insertEvent(track, chord, ticksPerMeasure)
      );
      set((prev) => ({
        ...applyHistory(prev, score),
        selectedEventIds: [chord.id],
      }));
    },
    removeEvent: (id) => {
      const state = get();
      const score = updateTrack(state.score, state.selectedTrackId, (track) => ({
        ...track,
        measures: track.measures.map((measure) => ({
          ...measure,
          voices: measure.voices.map((voice, voiceIndex) =>
            voiceIndex === 0
              ? {
                  ...voice,
                  events: voice.events.filter((event) => event.id !== id),
                }
              : voice
          ),
        })),
      }));
      set((prev) => ({
        ...applyHistory(prev, score),
        selectedEventIds: prev.selectedEventIds.filter((selected) => selected !== id),
      }));
    },
    moveSelected: (deltaTicks, deltaPitch) => {
      const state = get();
      if (state.selectedEventIds.length === 0) {
        return;
      }
      const ticksPerMeasure = measureTicks(state.score.timeSignature, state.score.ticksPerWhole);
      const durationTicks = durationToTicks(
        state.duration,
        state.dotted,
        state.triplet ? { n: 3, inTimeOf: 2 } : null,
        state.score.ticksPerWhole
      );

      const score = updateTrack(state.score, state.selectedTrackId, (track) => ({
        ...track,
        measures: track.measures.map((measure) => ({
          ...measure,
          voices: measure.voices.map((voice, voiceIndex) =>
            voiceIndex === 0
              ? {
                  ...voice,
                  events: voice.events.map((event) => {
                    if (!state.selectedEventIds.includes(event.id)) {
                      return event;
                    }
                    const nextTick = quantizeTick(event.startTick + deltaTicks, durationTicks);
                    if (event.type === "note") {
                      return {
                        ...event,
                        startTick: Math.max(0, nextTick),
                        pitchMidi: event.pitchMidi + deltaPitch,
                      };
                    }
                    if (event.type === "rest") {
                      return { ...event, startTick: Math.max(0, nextTick) };
                    }
                    return { ...event, startTick: Math.max(0, nextTick) };
                  }),
                }
              : voice
          ),
        })),
      }));

      set((prev) => ({
        ...applyHistory(prev, score),
        caretTick: Math.max(0, state.caretTick + deltaTicks),
      }));
    },
    updateEvent: (event) => {
      const state = get();
      const score = updateTrack(state.score, state.selectedTrackId, (track) => ({
        ...track,
        measures: track.measures.map((measure) => ({
          ...measure,
          voices: measure.voices.map((voice, voiceIndex) =>
            voiceIndex === 0
              ? {
                  ...voice,
                  events: voice.events.map((item) => (item.id === event.id ? event : item)),
                }
              : voice
          ),
        })),
      }));

      set((prev) => ({
        ...applyHistory(prev, score),
      }));
    },
    setTimeSignature: (timeSignature) => {
      const state = get();
      const score = { ...state.score, timeSignature };
      set((prev) => ({
        ...applyHistory(prev, score),
      }));
    },
    setKeySignature: (keySignature) => {
      const state = get();
      const score = { ...state.score, keySignature };
      set((prev) => ({
        ...applyHistory(prev, score),
      }));
    },
    setTrackInstrument: (trackId, instrumentId) => {
      const state = get();
      const instrument = getInstrumentById(instrumentId);
      const score = updateTrack(state.score, trackId, (track) => ({
        ...track,
        instrumentId,
        clef: instrument.clef,
        showTab: instrument.strings ? track.showTab : false,
      }));
      set((prev) => ({
        ...applyHistory(prev, score),
      }));
    },
    toggleTrackTab: (trackId) => {
      const state = get();
      const score = updateTrack(state.score, trackId, (track) => {
        const instrument = getInstrumentById(track.instrumentId);
        if (!instrument.strings) {
          return track;
        }
        return { ...track, showTab: !track.showTab };
      });
      set((prev) => ({
        ...applyHistory(prev, score),
      }));
    },
    toggleArticulation: (value) =>
      set((state) => ({
        activeArticulations: state.activeArticulations.includes(value)
          ? state.activeArticulations.filter((item) => item !== value)
          : [...state.activeArticulations, value],
      })),
    toggleOrnament: (value) =>
      set((state) => ({
        activeOrnaments: state.activeOrnaments.includes(value)
          ? state.activeOrnaments.filter((item) => item !== value)
          : [...state.activeOrnaments, value],
      })),
    toggleEffect: (value) =>
      set((state) => ({
        activeEffects: state.activeEffects.includes(value)
          ? state.activeEffects.filter((item) => item !== value)
          : [...state.activeEffects, value],
      })),
    setScale: (scaleId) => set({ activeScaleId: scaleId }),
    setScaleRoot: (midi) => set({ scaleRootMidi: midi }),
    undo: () =>
      set((state) => {
        if (state.historyIndex <= 0) {
          return state;
        }
        const historyIndex = state.historyIndex - 1;
        return {
          ...state,
          score: cloneScore(state.history[historyIndex]),
          historyIndex,
        };
      }),
    redo: () =>
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) {
          return state;
        }
        const historyIndex = state.historyIndex + 1;
        return {
          ...state,
          score: cloneScore(state.history[historyIndex]),
          historyIndex,
        };
      }),
    importScore: (score) =>
      set((state) => ({
        ...applyHistory(state, score),
        selectedTrackId: score.tracks[0]?.id ?? "",
      })),
  };
});

useEditorStore.subscribe((state) => state.score, (score) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(score));
});
