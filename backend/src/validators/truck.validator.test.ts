import { describe, expect, it } from 'vitest';
import { createTruckSchema, updateTruckSchema } from './truck.validator';

const requiredTruckFields = {
  make: 'Freightliner',
  model: 'Cascadia',
  year: 2024,
  type: 'DRY_VAN',
};

describe('truck request compatibility schemas', () => {
  it('normalizes requested truck and plate fields to existing database columns', async () => {
    const parsed = await createTruckSchema.parseAsync({
      body: {
        ...requiredTruckFields,
        truck_number: 'UNIT-10',
        plate_number: 'PLATE-10',
        status: 'available',
      },
    });

    expect(parsed.body).toMatchObject({
      unit_number: 'UNIT-10',
      license_plate: 'PLATE-10',
      status: 'ACTIVE',
    });
    expect(parsed.body).not.toHaveProperty('truck_number');
    expect(parsed.body).not.toHaveProperty('plate_number');
  });

  it('keeps legacy field and status values supported', async () => {
    const parsed = await createTruckSchema.parseAsync({
      body: {
        ...requiredTruckFields,
        unit_number: 'UNIT-11',
        license_plate: 'PLATE-11',
        status: 'MAINTENANCE',
      },
    });

    expect(parsed.body).toMatchObject({
      unit_number: 'UNIT-11',
      license_plate: 'PLATE-11',
      status: 'MAINTENANCE',
    });
  });

  it('maps maintenance input and rejects manually setting derived in-use status', async () => {
    const parsed = await updateTruckSchema.parseAsync({
      params: { id: '11111111-1111-4111-8111-111111111111' },
      body: { status: 'maintenance' },
    });
    expect(parsed.body.status).toBe('MAINTENANCE');
    expect(parsed.body).not.toHaveProperty('unit_number');
    expect(parsed.body).not.toHaveProperty('license_plate');

    await expect(updateTruckSchema.parseAsync({
      params: { id: '11111111-1111-4111-8111-111111111111' },
      body: { status: 'in_use' },
    })).rejects.toThrow();
  });
});
