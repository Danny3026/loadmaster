import { describe, expect, it } from 'vitest';
import { evaluateRateConfirmation } from './rate-confirmation.rules';

describe('evaluateRateConfirmation', () => {
  it('applies two free detention hours and calculates a discrepancy', () => {
    const result = evaluateRateConfirmation({
      total_rate: { value: 2500 },
      miles: { value: 780 },
      rate_per_mile: { value: 3 },
      fuel_surcharge: { value: 100 },
      accessorials: { value: 0 },
      detention_hours: { value: 5 },
      detention_rate: { value: 75 },
    });

    expect(result.detention_amount).toBe(225);
    expect(result.calculated_rate).toBe(2440);
    expect(result.rate_discrepancy_amount).toBe(60);
    expect(result.flags).toContain('RATE_DISCREPANCY');
  });
});