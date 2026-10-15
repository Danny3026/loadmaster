import { describe, expect, it } from 'vitest';
import { dateRangesOverlap } from './date-range';

describe('dateRangesOverlap', () => {
  it('detects inclusive overlap when a load begins during time off', () => {
    expect(dateRangesOverlap('2026-10-01', '2026-10-04', '2026-10-03', '2026-10-06')).toBe(true);
  });

  it('treats a shared boundary date as overlap', () => {
    expect(dateRangesOverlap('2026-10-01', '2026-10-04', '2026-10-04', '2026-10-07')).toBe(true);
  });

  it('does not overlap when the load starts the day after time off ends', () => {
    expect(dateRangesOverlap('2026-10-01', '2026-10-04', '2026-10-05', '2026-10-07')).toBe(false);
  });
});