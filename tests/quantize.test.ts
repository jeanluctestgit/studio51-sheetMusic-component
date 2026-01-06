import { describe, expect, test } from "vitest";
import { quantizeTick } from "../src/music/pitchUtils";

describe("note insertion quantization", () => {
  test("snaps to nearest grid", () => {
    expect(quantizeTick(122, 60)).toBe(120);
    expect(quantizeTick(149, 60)).toBe(150);
  });
});
