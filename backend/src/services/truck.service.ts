import { truckRepository } from '../repositories/truck.repository';
import { AppError, NotFoundError, ConflictError } from '../utils/errors';

export class TruckService {
  private async withAvailabilityStatus(companyId: string, truck: any) {
    const inUseTruckIds = await truckRepository.findInUseIds(companyId);
    const isInUse = inUseTruckIds.includes(truck.id);
    const availabilityStatus = truck.status === 'MAINTENANCE'
      ? 'maintenance'
      : truck.status === 'INACTIVE'
        ? 'inactive'
        : isInUse
          ? 'in_use'
          : 'available';

    return {
      ...truck,
      truck_number: truck.unit_number,
      plate_number: truck.license_plate ?? null,
      availability_status: availabilityStatus,
    };
  }

  async getAll(companyId: string, pagination: any) {
    const [trucks, inUseTruckIds] = await Promise.all([
      truckRepository.findAll(companyId, pagination),
      truckRepository.findInUseIds(companyId),
    ]);
    const inUseIds = new Set(inUseTruckIds);
    const data = trucks.map((truck: any) => ({
      ...truck,
      truck_number: truck.unit_number,
      plate_number: truck.license_plate ?? null,
      availability_status: truck.status === 'MAINTENANCE'
        ? 'maintenance'
        : truck.status === 'INACTIVE'
          ? 'inactive'
          : inUseIds.has(truck.id)
            ? 'in_use'
            : 'available',
    }));
    const total = await truckRepository.count(companyId);
    return { data, total };
  }

  async getById(companyId: string, id: string) {
    const truck = await truckRepository.findById(companyId, id);
    if (!truck) throw new NotFoundError('Truck not found');
    return this.withAvailabilityStatus(companyId, truck);
  }

  async create(companyId: string, data: any) {
    const truckNumber = data.unit_number ?? data.truck_number;
    const existing = await truckRepository.findByUnitNumber(companyId, truckNumber);
    if (existing) {
      throw new ConflictError('Truck with this unit number already exists in your company');
    }
    const { truck_number, plate_number, ...truckData } = data;
    const truck = await truckRepository.create(companyId, {
      ...truckData,
      unit_number: truckNumber,
      license_plate: truckData.license_plate ?? plate_number,
    });
    return this.withAvailabilityStatus(companyId, truck);
  }

  async update(companyId: string, id: string, data: any) {
    const truck = await truckRepository.findById(companyId, id);
    if (!truck) throw new NotFoundError('Truck not found');

    const truckNumber = data.unit_number ?? data.truck_number;
    if (truckNumber && truckNumber !== truck.unit_number) {
      const existing = await truckRepository.findByUnitNumber(companyId, truckNumber);
      if (existing) {
        throw new ConflictError('Truck with this unit number already exists');
      }
    }
    const { truck_number, plate_number, ...truckData } = data;
    const updatedTruck = await truckRepository.update(companyId, id, {
      ...truckData,
      ...(truckNumber ? { unit_number: truckNumber } : {}),
      ...(plate_number !== undefined && truckData.license_plate === undefined ? { license_plate: plate_number } : {}),
    });
    return this.withAvailabilityStatus(companyId, updatedTruck);
  }

  async delete(companyId: string, id: string) {
    const truck = await truckRepository.findById(companyId, id);
    if (!truck) throw new NotFoundError('Truck not found');
    await truckRepository.delete(companyId, id);
    return true;
  }
}

export const truckService = new TruckService();
