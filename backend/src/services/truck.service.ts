import { truckRepository } from '../repositories/truck.repository';
import { AppError, NotFoundError, ConflictError } from '../utils/errors';

export class TruckService {
  async getAll(companyId: string, pagination: any) {
    const data = await truckRepository.findAll(companyId, pagination);
    const total = await truckRepository.count(companyId);
    return { data, total };
  }

  async getById(companyId: string, id: string) {
    const truck = await truckRepository.findById(companyId, id);
    if (!truck) throw new NotFoundError('Truck not found');
    return truck;
  }

  async create(companyId: string, data: any) {
    const existing = await truckRepository.findByUnitNumber(companyId, data.unit_number);
    if (existing) {
      throw new ConflictError('Truck with this unit number already exists in your company');
    }
    return truckRepository.create(companyId, data);
  }

  async update(companyId: string, id: string, data: any) {
    const truck = await truckRepository.findById(companyId, id);
    if (!truck) throw new NotFoundError('Truck not found');

    if (data.unit_number && data.unit_number !== truck.unit_number) {
      const existing = await truckRepository.findByUnitNumber(companyId, data.unit_number);
      if (existing) {
        throw new ConflictError('Truck with this unit number already exists');
      }
    }
    return truckRepository.update(companyId, id, data);
  }

  async delete(companyId: string, id: string) {
    const truck = await truckRepository.findById(companyId, id);
    if (!truck) throw new NotFoundError('Truck not found');
    await truckRepository.delete(companyId, id);
    return true;
  }
}

export const truckService = new TruckService();
