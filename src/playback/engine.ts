import type { MusicalEvent, Score } from "../music/types";

const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export interface PlaybackHandle {
  stop: () => void;
}

export interface PlaybackOptions {
  score: Score;
  trackId: string;
  startTick: number;
  onTick: (tick: number) => void;
  onStop: () => void;
}

export const playScore = ({ score, trackId, startTick, onTick, onStop }: PlaybackOptions): PlaybackHandle => {
  const track = score.tracks.find((item) => item.id === trackId) ?? score.tracks[0];
  const events = track.measures.flatMap((measure) => measure.voices[0]?.events ?? []);
  const noteEvents = events.filter((event): event is MusicalEvent => event.type === "note");
  const ordered = noteEvents
    .filter((event) => event.startTick + event.durationTicks >= startTick)
    .sort((a, b) => a.startTick - b.startTick);

  const ticksPerQuarter = score.ticksPerWhole / 4;
  const tickDuration = 60 / (score.tempoBpm * ticksPerQuarter);

  const audioContext = new AudioContext();
  const gain = audioContext.createGain();
  gain.gain.value = 0.12;
  gain.connect(audioContext.destination);

  const startTime = audioContext.currentTime + 0.05;
  const lastTick = ordered.reduce(
    (max, event) => Math.max(max, event.startTick + event.durationTicks),
    startTick
  );

  ordered.forEach((event) => {
    const eventStart = startTime + (event.startTick - startTick) * tickDuration;
    event.pitches.forEach((pitch) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.value = midiToFrequency(pitch);
      oscillator.connect(gain);
      oscillator.start(eventStart);
      oscillator.stop(eventStart + event.durationTicks * tickDuration);
    });
  });

  const interval = window.setInterval(() => {
    const elapsed = audioContext.currentTime - startTime;
    const tick = startTick + elapsed / tickDuration;
    if (tick >= lastTick) {
      stop();
      return;
    }
    onTick(tick);
  }, 30);

  const stop = () => {
    window.clearInterval(interval);
    audioContext.close().finally(() => {
      onStop();
    });
  };

  return { stop };
};
