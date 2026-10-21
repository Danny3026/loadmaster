import { beforeEach, describe, expect, it, vi } from 'vitest';
import { truckRepository } from '../repositories/truck.repository';
import { TruckService } from './truck.service';

vi.mock('../repositories/truck.repository', () => ({
  truckRepository: {
    findAll: vi.fn(),
    count: vi.fn(),
    findById: vi.fn(),
    findByUnitNumber: vi.fn(),
    findInUseIds: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('TruckService compatibility fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(truckRepository.findInUseIds).mockResolvedValue([]);
  });

  it('persists aliases using the existing company-scoped truck columns', async () => {
    const truck = {
      id: 'truck-id',
      company_id: 'company-id',
      unit_number: 'UNIT-10',
      license_plate: 'PLATE-10',
      status: 'ACTIVE',
    };
    vi.mocked(truckRepository.findByUnitNumber).mockResolvedValue(null as any);
    vi.mocked(truckRepository.create).mockResolvedValue(truck as any);

    const result = await new TruckService().create('company-id', {
      truck_number: 'UNIT-10',
      plate_number: 'PLATE-10',
      make: 'Freightliner',
      model: 'Cascadia',
      year: 2024,
      type: 'DRY_VAN',
      status: 'ACTIVE',
    });

    expect(truckRepository.findByUnitNumber).toHaveBeenCalledWith('company-id', 'UNIT-10');
    expect(truckRepository.create).toHaveBeenCalledWith('company-id', expect.objectContaining({
      unit_number: 'UNIT-10',
      license_plate: 'PLATE-10',
    }));
    expect(result).toMatchObject({
      truck_number: 'UNIT-10',
      plate_number: 'PLATE-10',
      availability_status: 'available',
      status: 'ACTIVE',
    });
  });

  it('reports in-use status from active assignments without changing stored truck status', async () => {
    vi.mocked(truckRepository.findAll).mockResolvedValue([
      { id: 'truck-a', unit_number: 'A', license_plate: null, status: 'ACTIVE' },
      { id: 'truck-b', unit_number: 'B', license_plate: null, status: 'MAINTENANCE' },
      { id: 'truck-c', unit_number: 'C', license_plate: null, status: 'INACTIVE' },
    ] as any);
    vi.mocked(truckRepository.findInUseIds).mockResolvedValue(['truck-a']);
    vi.mocked(truckRepository.count).mockResolvedValue(3);

    const result = await new TruckService().getAll('company-id', { limit: 100, offset: 0 });

    expect(truckRepository.findInUseIds).toHaveBeenCalledWith('company-id');
    expect(result.data.map((truck: any) => truck.availability_status)).toEqual([
      'in_use',
      'maintenance',
      'inactive',
    ]);
    expect(result.data[0].status).toBe('ACTIVE');
  });

  it('updates truck number and plate aliases without losing tenant scope', async () => {
    vi.mocked(truckRepository.findById).mockResolvedValue({
      id: 'truck-id',
      unit_number: 'OLD-UNIT',
      status: 'ACTIVE',
    } as any);
    vi.mocked(truckRepository.findByUnitNumber).mockResolvedValue(null as any);
    vi.mocked(truckRepository.update).mockResolvedValue({
      id: 'truck-id',
      unit_number: 'NEW-UNIT',
      license_plate: 'NEW-PLATE',
      status: 'ACTIVE',
    } as any);

    await new TruckService().update('company-id', 'truck-id', {
      truck_number: 'NEW-UNIT',
      plate_number: 'NEW-PLATE',
    });

    expect(truckRepository.findById).toHaveBeenCalledWith('company-id', 'truck-id');
    expect(truckRepository.findByUnitNumber).toHaveBeenCalledWith('company-id', 'NEW-UNIT');
    expect(truckRepository.update).toHaveBeenCalledWith('company-id', 'truck-id', {
      unit_number: 'NEW-UNIT',
      license_plate: 'NEW-PLATE',
    });
  });
});
