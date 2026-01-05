import { describe, expect, test } from "vitest";
import { createLayoutHelpers, DEFAULT_LAYOUT } from "../src/editor/layout";

const helpers = createLayoutHelpers(
  DEFAULT_LAYOUT,
  { beats: 4, beatUnit: 4 },
  1024,
  "treble"
);

describe("pitch/staff mapping", () => {
  test("maps E4 to bottom line and back", () => {
    const y = helpers.pitchToY(64);
    const midi = helpers.yToPitch(y);
    expect(midi).toBe(64);
  });

  test("maps C5 to higher position", () => {
    const y = helpers.pitchToY(72);
    const midi = helpers.yToPitch(y);
    expect(midi).toBe(72);
  });
});
