import { describe, expect, it } from 'vitest';
import { createDriverAvailabilitySchema, updateDriverAvailabilitySchema } from './driver-availability.validator';

const driverId = 'fdbf6c19-783a-4bf4-8841-4a4f9c5e0d51';
const availabilityId = '8d9fa1fd-c49b-48b6-946a-28b7dc56cc82';

describe('driver availability validation', () => {
  it('accepts an inclusive date range and optional reason', () => {
    expect(createDriverAvailabilitySchema.safeParse({
      params: { id: driverId },
      body: { start_date: '2026-10-01', end_date: '2026-10-04', reason: 'Vacation' },
    }).success).toBe(true);
  });

  it('rejects reversed date ranges', () => {
    expect(createDriverAvailabilitySchema.safeParse({
      params: { id: driverId },
      body: { start_date: '2026-10-04', end_date: '2026-10-01' },
    }).success).toBe(false);
  });

  it('allows partial updates when the resulting range can be valid', () => {
    expect(updateDriverAvailabilitySchema.safeParse({
      params: { id: driverId, availabilityId },
      body: { reason: 'Home time' },
    }).success).toBe(true);
  });
});