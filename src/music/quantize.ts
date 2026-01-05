export const quantizeTick = (tick: number, grid: number) => {
  if (grid <= 0) {
    return tick;
  }
  return Math.round(tick / grid) * grid;
};
