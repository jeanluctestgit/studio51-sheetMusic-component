import type { InstrumentDefinition } from "./instruments";
import type { NoteEvent } from "./types";

export interface TabPosition {
  strings: number[];
  frets: number[];
}

export interface TabContext {
  mainPosition: { stringIndex: number; fret: number } | null;
}

interface TabCandidate {
  stringIndex: number;
  fret: number;
  score: number;
}

const MAX_FRET = 24;
const MAX_CHORD_NOTES = 6;
const MAX_CHORD_SPAN = 5;

export const createTabContext = (): TabContext => ({
  mainPosition: null,
});

const scoreCandidate = (
  candidate: { stringIndex: number; fret: number },
  instrument: InstrumentDefinition,
  context: TabContext
) => {
  const middle = ((instrument.strings?.length ?? 1) - 1) / 2;
  const stringPenalty = Math.abs(candidate.stringIndex - middle) * 0.35;
  const extremePenalty =
    candidate.stringIndex === 0 || candidate.stringIndex === (instrument.strings?.length ?? 1) - 1 ? 0.4 : 0;
  const distancePenalty = context.mainPosition
    ? Math.abs(candidate.fret - context.mainPosition.fret) * 0.7 +
      Math.abs(candidate.stringIndex - context.mainPosition.stringIndex) * 0.5
    : 0;

  return candidate.fret + stringPenalty + extremePenalty + distancePenalty;
};

const getCandidates = (
  pitchMidi: number,
  instrument: InstrumentDefinition,
  context: TabContext
) => {
  if (!instrument.strings) {
    return [];
  }

  return instrument.strings
    .map((stringMidi, index) => ({
      stringIndex: index,
      fret: pitchMidi - stringMidi,
    }))
    .filter((candidate) => candidate.fret >= 0 && candidate.fret <= MAX_FRET)
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate, instrument, context),
    }))
    .sort((a, b) => a.score - b.score || a.fret - b.fret);
};

export const mapNoteToTab = (
  note: Pick<NoteEvent, "pitchMidi">,
  instrument: InstrumentDefinition,
  context: TabContext
): TabPosition | null => {
  const candidates = getCandidates(note.pitchMidi, instrument, context);
  if (candidates.length === 0) {
    return null;
  }

  const chosen = candidates[0];
  context.mainPosition = { stringIndex: chosen.stringIndex, fret: chosen.fret };
  return { strings: [chosen.stringIndex], frets: [chosen.fret] };
};

export const mapChordToTab = (
  notesSameTick: Array<Pick<NoteEvent, "id" | "pitchMidi">>,
  instrument: InstrumentDefinition,
  context: TabContext
) => {
  if (!instrument.strings) {
    return new Map<string, TabPosition>();
  }

  const maxNotes = Math.min(MAX_CHORD_NOTES, instrument.strings.length);
  const chordNotes =
    notesSameTick.length > maxNotes
      ? [...notesSameTick].sort((a, b) => b.pitchMidi - a.pitchMidi).slice(0, maxNotes)
      : notesSameTick;

  const candidatesByNote = chordNotes.map((note) => ({
    note,
    candidates: getCandidates(note.pitchMidi, instrument, context).slice(0, 4),
  }));

  const best = { score: Number.POSITIVE_INFINITY, picks: [] as { noteId: string; candidate: TabCandidate }[] };

  const search = (
    index: number,
    usedStrings: Set<number>,
    picks: { noteId: string; candidate: TabCandidate }[]
  ) => {
    if (index === candidatesByNote.length) {
      const frets = picks.map((pick) => pick.candidate.fret);
      const minFret = Math.min(...frets);
      const maxFret = Math.max(...frets);
      const span = maxFret - minFret;
      const spanPenalty = span > MAX_CHORD_SPAN ? (span - MAX_CHORD_SPAN) * 3 : span * 1.25;
      const movementPenalty = context.mainPosition
        ? Math.abs((minFret + maxFret) / 2 - context.mainPosition.fret) * 0.4
        : 0;
      const score =
        picks.reduce((sum, pick) => sum + pick.candidate.score, 0) + spanPenalty + movementPenalty;

      if (score < best.score) {
        best.score = score;
        best.picks = picks;
      }
      return;
    }

    const { note, candidates } = candidatesByNote[index];
    candidates.forEach((candidate) => {
      if (usedStrings.has(candidate.stringIndex)) {
        return;
      }
      usedStrings.add(candidate.stringIndex);
      search(index + 1, usedStrings, [...picks, { noteId: note.id, candidate }]);
      usedStrings.delete(candidate.stringIndex);
    });
  };

  search(0, new Set(), []);

  const positions = new Map<string, TabPosition>();
  if (best.picks.length === 0) {
    const usedStrings = new Set<number>();
    candidatesByNote.forEach(({ note, candidates }) => {
      const choice = candidates.find((candidate) => !usedStrings.has(candidate.stringIndex));
      if (!choice) {
        return;
      }
      usedStrings.add(choice.stringIndex);
      positions.set(note.id, { strings: [choice.stringIndex], frets: [choice.fret] });
    });
  } else {
    best.picks.forEach((pick) => {
      positions.set(pick.noteId, { strings: [pick.candidate.stringIndex], frets: [pick.candidate.fret] });
    });
  }

  if (positions.size > 0) {
    const allPositions = [...positions.values()];
    const averageString = allPositions.reduce((sum, pos) => sum + pos.strings[0], 0) / allPositions.length;
    const averageFret = allPositions.reduce((sum, pos) => sum + pos.frets[0], 0) / allPositions.length;
    context.mainPosition = { stringIndex: averageString, fret: averageFret };
  }

  return positions;
};

export const mapPitchToTab = (
  pitchMidi: number,
  instrument: InstrumentDefinition
): TabPosition | null => {
  const context = createTabContext();
  return mapNoteToTab({ pitchMidi }, instrument, context);
};

export const mapNotesToTabPositions = (
  notes: { id: string; pitchMidi: number; startTick: number }[],
  instrument: InstrumentDefinition
) => {
  if (!instrument.strings) {
    return new Map<string, TabPosition>();
  }

  const positions = new Map<string, TabPosition>();
  const context = createTabContext();
  const grouped = new Map<number, { id: string; pitchMidi: number; startTick: number }[]>();

  notes.forEach((note) => {
    if (!grouped.has(note.startTick)) {
      grouped.set(note.startTick, []);
    }
    grouped.get(note.startTick)?.push(note);
  });

  const orderedTicks = [...grouped.keys()].sort((a, b) => a - b);
  orderedTicks.forEach((tick) => {
    const group = grouped.get(tick) ?? [];
    if (group.length === 1) {
      const mapped = mapNoteToTab(group[0], instrument, context);
      if (mapped) {
        positions.set(group[0].id, mapped);
      }
      return;
    }
    const chordPositions = mapChordToTab(group, instrument, context);
    chordPositions.forEach((value, key) => {
      positions.set(key, value);
    });
  });

  return positions;
};
