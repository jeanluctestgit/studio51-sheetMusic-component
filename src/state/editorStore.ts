import { create } from "zustand";
import type {
  Articulation,
  ChordSymbolEvent,
  Effect,
  KeySignature,
  MusicalEvent,
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
import { buildExampleEvents } from "../music/examples";
import { createId } from "../utils/id";
import { playScore, type PlaybackHandle } from "../playback/engine";

const STORAGE_KEY = "studio51-score";
const HISTORY_LIMIT = 50;

interface CommandSnapshot {
  score: Score;
  caretTick: number;
  selectedEventIds: string[];
}

interface EditorCommand {
  id: string;
  label: string;
  before: CommandSnapshot;
  after: CommandSnapshot;
}

const cloneScore = (score: Score) => structuredClone(score);

const buildInitialScore = (): Score => {
  const ticksPerWhole = TICKS_PER_WHOLE;
  const timeSignature = { beats: 4, beatUnit: 4 };
  const ticksPerMeasure = measureTicks(timeSignature, ticksPerWhole);
  const exampleEvents = buildExampleEvents(createId, ticksPerWhole);

  const measures = Array.from({ length: 4 }, (_, index) => ({
    id: createId(),
    index,
    voices: [
      {
        id: createId(),
        events: [],
      },
    ],
  }));

  exampleEvents.forEach((event) => {
    const measureIndex = Math.floor(event.startTick / ticksPerMeasure);
    const measure = measures[measureIndex];
    if (!measure) {
      return;
    }
    measure.voices[0].events.push(event);
  });

  measures.forEach((measure) => {
    measure.voices[0].events.sort((a, b) => a.startTick - b.startTick);
  });

  return {
    id: createId(),
    title: "Studio51 MVP",
    tempoBpm: 120,
    timeSignature,
    keySignature: "C",
    ticksPerWhole,
    tracks: [
      {
        id: createId(),
        name: "Guitar",
        clef: "treble",
        instrumentId: "guitar-standard",
        showTab: true,
        measures,
      },
    ],
  };
};

const loadInitialScore = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return buildInitialScore();
  }
  const parsed = JSON.parse(raw) as Score;
  return {
    ...buildInitialScore(),
    ...parsed,
    tempoBpm: parsed.tempoBpm ?? 120,
  };
};

const snapshotFromState = (state: EditorState): CommandSnapshot => ({
  score: cloneScore(state.score),
  caretTick: state.caretTick,
  selectedEventIds: [...state.selectedEventIds],
});

const applyCommand = (state: EditorState, command: EditorCommand) => {
  const nextHistory = state.history.slice(0, state.historyIndex + 1);
  nextHistory.push(command);
  if (nextHistory.length > HISTORY_LIMIT) {
    nextHistory.shift();
  }
  return {
    score: command.after.score,
    caretTick: command.after.caretTick,
    selectedEventIds: command.after.selectedEventIds,
    history: nextHistory,
    historyIndex: nextHistory.length - 1,
  };
};

const updateTrack = (score: Score, trackId: string, updater: (track: Track) => Track) => ({
  ...score,
  tracks: score.tracks.map((track) => (track.id === trackId ? updater(track) : track)),
});

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

export interface EditorState {
  score: Score;
  history: EditorCommand[];
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
  activeFret: number;
  isPlaying: boolean;
  playbackTick: number;
  setTempoBpm: (tempo: number) => void;
  setTool: (tool: ToolId) => void;
  setDuration: (duration: EditorState["duration"]) => void;
  toggleDotted: () => void;
  toggleTriplet: () => void;
  setCaretTick: (tick: number) => void;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  addNoteAt: (payload: { tick: number; pitchMidi: number; performanceHints?: { string?: number; fret?: number } }) => void;
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
  setActiveFret: (fret: number) => void;
  undo: () => void;
  redo: () => void;
  importScore: (score: Score) => void;
  play: () => void;
  stop: () => void;
}

let playbackHandle: PlaybackHandle | null = null;

export const useEditorStore = create<EditorState>((set, get) => {
  const initialScore = loadInitialScore();

  return {
    score: initialScore,
    history: [
      {
        id: createId(),
        label: "Initial",
        before: {
          score: cloneScore(initialScore),
          caretTick: 0,
          selectedEventIds: [],
        },
        after: {
          score: cloneScore(initialScore),
          caretTick: 0,
          selectedEventIds: [],
        },
      },
    ],
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
    activeFret: 3,
    isPlaying: false,
    playbackTick: 0,
    setTempoBpm: (tempo) => {
      const state = get();
      const nextTempo = Number.isFinite(tempo) ? Math.max(20, Math.min(260, tempo)) : state.score.tempoBpm;
      const score = { ...state.score, tempoBpm: nextTempo };
      const before = snapshotFromState(state);
      const after = {
        score: cloneScore(score),
        caretTick: state.caretTick,
        selectedEventIds: [...state.selectedEventIds],
      };
      const command: EditorCommand = {
        id: createId(),
        label: "Tempo",
        before,
        after,
      };
      set((prev) => ({
        ...applyCommand(prev, command),
      }));
    },
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
    addNoteAt: ({ tick, pitchMidi, performanceHints }) => {
      const state = get();
      const ticksPerMeasure = measureTicks(state.score.timeSignature, state.score.ticksPerWhole);
      const durationTicks = durationToTicks(
        state.duration,
        state.dotted,
        state.triplet ? { n: 3, inTimeOf: 2 } : null,
        state.score.ticksPerWhole
      );
      const quantized = quantizeTick(tick, durationTicks);
      const note: MusicalEvent = {
        id: createId(),
        type: "note",
        startTick: quantized,
        durationTicks,
        pitches: [pitchMidi],
        articulations: [...state.activeArticulations],
        ornaments: [...state.activeOrnaments],
        effects: [...state.activeEffects],
        performanceHints: performanceHints ?? {},
      };

      const score = updateTrack(state.score, state.selectedTrackId, (track) =>
        insertEvent(track, note, ticksPerMeasure)
      );
      const before = snapshotFromState(state);
      const after = {
        score: cloneScore(score),
        caretTick: quantized + durationTicks,
        selectedEventIds: [note.id],
      };
      const command: EditorCommand = {
        id: createId(),
        label: "Add note",
        before,
        after,
      };
      set((prev) => ({
        ...applyCommand(prev, command),
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
      const before = snapshotFromState(state);
      const after = {
        score: cloneScore(score),
        caretTick: quantized + durationTicks,
        selectedEventIds: [rest.id],
      };
      const command: EditorCommand = {
        id: createId(),
        label: "Add rest",
        before,
        after,
      };
      set((prev) => ({
        ...applyCommand(prev, command),
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
      const before = snapshotFromState(state);
      const after = {
        score: cloneScore(score),
        caretTick: state.caretTick,
        selectedEventIds: [chord.id],
      };
      const command: EditorCommand = {
        id: createId(),
        label: "Add chord",
        before,
        after,
      };
      set((prev) => ({
        ...applyCommand(prev, command),
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
      const before = snapshotFromState(state);
      const after = {
        score: cloneScore(score),
        caretTick: state.caretTick,
        selectedEventIds: state.selectedEventIds.filter((selected) => selected !== id),
      };
      const command: EditorCommand = {
        id: createId(),
        label: "Remove event",
        before,
        after,
      };
      set((prev) => ({
        ...applyCommand(prev, command),
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
                        pitches: event.pitches.map((pitch) => pitch + deltaPitch),
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

      const before = snapshotFromState(state);
      const after = {
        score: cloneScore(score),
        caretTick: Math.max(0, state.caretTick + deltaTicks),
        selectedEventIds: [...state.selectedEventIds],
      };
      const command: EditorCommand = {
        id: createId(),
        label: "Move event",
        before,
        after,
      };
      set((prev) => ({
        ...applyCommand(prev, command),
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

      const before = snapshotFromState(state);
      const after = {
        score: cloneScore(score),
        caretTick: state.caretTick,
        selectedEventIds: [...state.selectedEventIds],
      };
      const command: EditorCommand = {
        id: createId(),
        label: "Update event",
        before,
        after,
      };
      set((prev) => ({
        ...applyCommand(prev, command),
      }));
    },
    setTimeSignature: (timeSignature) => {
      const state = get();
      const score = { ...state.score, timeSignature };
      const before = snapshotFromState(state);
      const after = {
        score: cloneScore(score),
        caretTick: state.caretTick,
        selectedEventIds: [...state.selectedEventIds],
      };
      const command: EditorCommand = {
        id: createId(),
        label: "Time signature",
        before,
        after,
      };
      set((prev) => ({
        ...applyCommand(prev, command),
      }));
    },
    setKeySignature: (keySignature) => {
      const state = get();
      const score = { ...state.score, keySignature };
      const before = snapshotFromState(state);
      const after = {
        score: cloneScore(score),
        caretTick: state.caretTick,
        selectedEventIds: [...state.selectedEventIds],
      };
      const command: EditorCommand = {
        id: createId(),
        label: "Key signature",
        before,
        after,
      };
      set((prev) => ({
        ...applyCommand(prev, command),
      }));
    },
    setTrackInstrument: (trackId, instrumentId) => {
      const state = get();
      const instrument = getInstrumentById(instrumentId);
      const score = updateTrack(state.score, trackId, (track) => ({
        ...track,
        instrumentId,
        clef: instrument.clef,
        showTab: instrument.strings ? true : false,
      }));
      const before = snapshotFromState(state);
      const after = {
        score: cloneScore(score),
        caretTick: state.caretTick,
        selectedEventIds: [...state.selectedEventIds],
      };
      const command: EditorCommand = {
        id: createId(),
        label: "Change instrument",
        before,
        after,
      };
      set((prev) => ({
        ...applyCommand(prev, command),
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
      const before = snapshotFromState(state);
      const after = {
        score: cloneScore(score),
        caretTick: state.caretTick,
        selectedEventIds: [...state.selectedEventIds],
      };
      const command: EditorCommand = {
        id: createId(),
        label: "Toggle tab",
        before,
        after,
      };
      set((prev) => ({
        ...applyCommand(prev, command),
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
    setActiveFret: (fret) => set({ activeFret: Math.max(0, Math.min(24, fret)) }),
    undo: () =>
      set((state) => {
        if (state.historyIndex <= 0) {
          return state;
        }
        const command = state.history[state.historyIndex];
        return {
          ...state,
          score: cloneScore(command.before.score),
          caretTick: command.before.caretTick,
          selectedEventIds: [...command.before.selectedEventIds],
          historyIndex: state.historyIndex - 1,
        };
      }),
    redo: () =>
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) {
          return state;
        }
        const nextIndex = state.historyIndex + 1;
        const command = state.history[nextIndex];
        return {
          ...state,
          score: cloneScore(command.after.score),
          caretTick: command.after.caretTick,
          selectedEventIds: [...command.after.selectedEventIds],
          historyIndex: nextIndex,
        };
      }),
    importScore: (score) => {
      const normalized: Score = {
        ...buildInitialScore(),
        ...score,
        tempoBpm: score.tempoBpm ?? 120,
      };
      set((state) => ({
        ...applyCommand(state, {
          id: createId(),
          label: "Import score",
          before: snapshotFromState(state),
          after: {
            score: cloneScore(normalized),
            caretTick: 0,
            selectedEventIds: [],
          },
        }),
        selectedTrackId: normalized.tracks[0]?.id ?? "",
      }));
    },
    play: () => {
      const state = get();
      if (state.isPlaying) {
        return;
      }
      playbackHandle?.stop();
      set({ isPlaying: true, playbackTick: state.caretTick });
      playbackHandle = playScore({
        score: state.score,
        trackId: state.selectedTrackId,
        startTick: state.caretTick,
        onTick: (tick) => set({ playbackTick: tick }),
        onStop: () => set({ isPlaying: false }),
      });
    },
    stop: () => {
      playbackHandle?.stop();
      playbackHandle = null;
      set((state) => ({ isPlaying: false, playbackTick: state.caretTick }));
    },
  };
});

useEditorStore.subscribe(
  (state) => state.score,
  (score) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(score));
  }
);
