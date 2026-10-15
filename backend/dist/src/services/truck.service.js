import { truckRepository } from '../repositories/truck.repository';
import { NotFoundError, ConflictError } from '../utils/errors';
export class TruckService {
    async getAll(companyId, pagination) {
        const data = await truckRepository.findAll(companyId, pagination);
        const total = await truckRepository.count(companyId);
        return { data, total };
    }
    async getById(companyId, id) {
        const truck = await truckRepository.findById(companyId, id);
        if (!truck)
            throw new NotFoundError('Truck not found');
        return truck;
    }
    async create(companyId, data) {
        const existing = await truckRepository.findByUnitNumber(companyId, data.unit_number);
        if (existing) {
            throw new ConflictError('Truck with this unit number already exists in your company');
        }
        return truckRepository.create(companyId, data);
    }
    async update(companyId, id, data) {
        const truck = await truckRepository.findById(companyId, id);
        if (!truck)
            throw new NotFoundError('Truck not found');
        if (data.unit_number && data.unit_number !== truck.unit_number) {
            const existing = await truckRepository.findByUnitNumber(companyId, data.unit_number);
            if (existing) {
                throw new ConflictError('Truck with this unit number already exists');
            }
        }
        return truckRepository.update(companyId, id, data);
    }
    async delete(companyId, id) {
        const truck = await truckRepository.findById(companyId, id);
        if (!truck)
            throw new NotFoundError('Truck not found');
        await truckRepository.delete(companyId, id);
        return true;
    }
}
export const truckService = new TruckService();
