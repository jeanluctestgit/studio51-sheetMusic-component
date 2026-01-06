import { describe, expect, test } from "vitest";
import { pitchToY, yToPitch } from "../src/music/pitchUtils";

const staffBottom = 40 + 12 * 4;

describe("pitch ↔ y mapping", () => {
  test("maps E4 to bottom line and back", () => {
    const y = pitchToY(64, staffBottom);
    const midi = yToPitch(y, staffBottom);
    expect(midi).toBe(64);
  });

  test("maps C5 to higher position", () => {
    const y = pitchToY(72, staffBottom);
    const midi = yToPitch(y, staffBottom);
    expect(midi).toBe(72);
  });
});
