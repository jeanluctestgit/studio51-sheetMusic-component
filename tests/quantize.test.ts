import { describe, expect, test } from "vitest";
import { quantizeTick } from "../src/music/quantize";

describe("quantizeTick", () => {
  test("snaps to nearest grid", () => {
    expect(quantizeTick(130, 64)).toBe(128);
    expect(quantizeTick(160, 64)).toBe(192);
  });
});
