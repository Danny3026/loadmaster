export const dateRangesOverlap = (startA: string, endA: string, startB: string, endB: string) =>
  startA <= endB && endA >= startB;