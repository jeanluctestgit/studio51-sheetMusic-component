import { describe, expect, test } from "vitest";
import { mapPitchToTab } from "../src/music/mapping";

describe("mapping pitch → string/fret", () => {
  test("maps E4 to open high E on guitar", () => {
    const tab = mapPitchToTab(64, "guitar");
    expect(tab.stringIndex).toBe(5);
    expect(tab.fret).toBe(0);
  });

  test("maps G3 to guitar string", () => {
    const tab = mapPitchToTab(55, "guitar");
    expect(tab.fret).toBeGreaterThanOrEqual(0);
  });
});
