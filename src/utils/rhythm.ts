import type { BaseDuration, Tuplet } from "./types";

export const TUPLET_PRESETS: Tuplet[] = [
  { n: 3, inTimeOf: 2 },
  { n: 5, inTimeOf: 4 },
  { n: 6, inTimeOf: 4 },
  { n: 7, inTimeOf: 4 },
];

export type Fraction = { num: number; den: number };

const normalizeFraction = (fraction: Fraction): Fraction => {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(fraction.num, fraction.den);
  return {
    num: fraction.num / divisor,
    den: fraction.den / divisor,
  };
};

const multiplyFractions = (left: Fraction, right: Fraction): Fraction =>
  normalizeFraction({
    num: left.num * right.num,
    den: left.den * right.den,
  });

export const parseDuration = (duration: BaseDuration): Fraction => {
  const [num, den] = duration.split("/").map(Number);
  return { num, den };
};

export const computeEffectiveDuration = (
  baseDuration: BaseDuration,
  dotted: boolean,
  tuplet: Tuplet | null
): Fraction => {
  const baseFraction = parseDuration(baseDuration);
  const dottedMultiplier = dotted ? { num: 3, den: 2 } : { num: 1, den: 1 };
  const tupletMultiplier = tuplet
    ? { num: tuplet.inTimeOf, den: tuplet.n }
    : { num: 1, den: 1 };

  return [baseFraction, dottedMultiplier, tupletMultiplier].reduce(
    (acc, value) => multiplyFractions(acc, value),
    { num: 1, den: 1 }
  );
};

export const toDurationTicks = (
  baseDuration: BaseDuration,
  dotted: boolean,
  tuplet: Tuplet | null,
  ticksPerWhole = 1024
): number => {
  const effective = computeEffectiveDuration(baseDuration, dotted, tuplet);
  return Math.round((effective.num / effective.den) * ticksPerWhole);
};

export const formatDurationLabel = (
  baseDuration: BaseDuration,
  dotted: boolean,
  tuplet: Tuplet | null
): string => {
  const parts = [baseDuration];
  if (dotted) {
    parts.push("point");
  }
  if (tuplet) {
    parts.push(`${tuplet.n}:${tuplet.inTimeOf}`);
  }
  return parts.join(" · ");
};

export const getFlagCount = (baseDuration: BaseDuration): number => {
  switch (baseDuration) {
    case "1/8":
      return 1;
    case "1/16":
      return 2;
    case "1/32":
      return 3;
    default:
      return 0;
  }
};

export const isBeammableDuration = (baseDuration: BaseDuration): boolean =>
  getFlagCount(baseDuration) > 0;
