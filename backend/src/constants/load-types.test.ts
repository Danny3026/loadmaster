import { describe, expect, it } from 'vitest';
import { LOAD_TYPES, normalizeEquipmentType } from './load-types';
import { createLoadSchema } from '../validators/load.validator';

const requiredTypes = ['DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'BOX_TRUCK', 'POWER_ONLY', 'HOTSHOT', 'TANKER', 'CONESTOGA', 'LOWBOY_RGN', 'OTHER'];

describe('load type contract', () => {
  it('contains each supported type exactly once', () => {
    expect(new Set(LOAD_TYPES).size).toBe(LOAD_TYPES.length);
    for (const type of requiredTypes) expect(LOAD_TYPES).toContain(type);
  });

  it('accepts every canonical type when creating a load', () => {
    for (const equipment_type of LOAD_TYPES) {
      const result = createLoadSchema.safeParse({
        body: {
          rate: 1,
          equipment_type,
          stops: [
            { stop_sequence: 1, stop_type: 'PICKUP', facility_name: 'Origin', city: 'Dallas', state: 'TX' },
            { stop_sequence: 2, stop_type: 'DELIVERY', facility_name: 'Destination', city: 'Austin', state: 'TX' },
          ],
        },
      });
      expect(result.success).toBe(true);
    }
  });

  it('normalizes free-form equipment aliases and preserves unknown labels', () => {
    expect(normalizeEquipmentType('Straight Box Truck')).toEqual({ equipmentType: 'BOX_TRUCK', raw: 'Straight Box Truck' });
    expect(normalizeEquipmentType("53' Van").equipmentType).toBe('DRY_VAN');
    expect(normalizeEquipmentType('Temp Controlled').equipmentType).toBe('REEFER');
    expect(normalizeEquipmentType('Mystery Trailer')).toEqual({ equipmentType: 'OTHER', raw: 'Mystery Trailer' });
  });
});