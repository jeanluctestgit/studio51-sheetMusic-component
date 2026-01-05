import { describe, expect, test } from "vitest";
import { getFlagCount, toDurationTicks } from "../src/utils/rhythm";

const TICKS_PER_WHOLE = 1024;

describe("rhythm utilities", () => {
  test("toDurationTicks maps quarter note correctly", () => {
    expect(toDurationTicks("1/4", false, null, TICKS_PER_WHOLE)).toBe(256);
  });

  test("toDurationTicks accounts for dotted eighth", () => {
    expect(toDurationTicks("1/8", true, null, TICKS_PER_WHOLE)).toBe(192);
  });

  test("getFlagCount maps durations", () => {
    expect(getFlagCount("1/4")).toBe(0);
    expect(getFlagCount("1/8")).toBe(1);
    expect(getFlagCount("1/16")).toBe(2);
    expect(getFlagCount("1/32")).toBe(3);
  });
});
