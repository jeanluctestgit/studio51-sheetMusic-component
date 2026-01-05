export const TUPLET_PRESETS = [
  { n: 3, inTimeOf: 2, label: "Triolet" },
  { n: 5, inTimeOf: 4, label: "Quintolet" },
  { n: 6, inTimeOf: 4, label: "Sextolet" },
  { n: 7, inTimeOf: 4, label: "Heptolet" },
];

const normalizeFraction = (fraction) => {
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(fraction.num, fraction.den);
  return {
    num: fraction.num / divisor,
    den: fraction.den / divisor,
  };
};

const multiplyFractions = (left, right) =>
  normalizeFraction({
    num: left.num * right.num,
    den: left.den * right.den,
  });

export const parseDuration = (duration) => {
  const [num, den] = duration.split("/").map(Number);
  return { num, den };
};

export const computeEffectiveDuration = (baseDuration, isDotted, tuplet) => {
  const baseFraction = parseDuration(baseDuration);
  const dottedMultiplier = isDotted ? { num: 3, den: 2 } : { num: 1, den: 1 };
  const tupletMultiplier = tuplet
    ? { num: tuplet.inTimeOf, den: tuplet.n }
    : { num: 1, den: 1 };

  return [baseFraction, dottedMultiplier, tupletMultiplier].reduce(
    (acc, value) => multiplyFractions(acc, value),
    { num: 1, den: 1 }
  );
};

export const toDurationTicks = (
  baseDuration,
  isDotted,
  tuplet,
  ticksPerWhole = 1024
) => {
  const effective = computeEffectiveDuration(baseDuration, isDotted, tuplet);
  return Math.round((effective.num / effective.den) * ticksPerWhole);
};

export const formatDurationLabel = (baseDuration, isDotted, tuplet) => {
  const parts = [baseDuration];
  if (isDotted) {
    parts.push("point");
  }
  if (tuplet) {
    parts.push(`${tuplet.n}:${tuplet.inTimeOf}`);
  }
  return parts.join(" · ");
};
