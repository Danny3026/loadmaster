import { brokerRepository } from '../repositories/broker.repository';
import { NotFoundError } from '../utils/errors';
export class BrokerService {
    async getAll(companyId, pagination) {
        const data = await brokerRepository.findAll(companyId, pagination);
        const total = await brokerRepository.count(companyId);
        return { data, total };
    }
    async getById(companyId, id) {
        const broker = await brokerRepository.findById(companyId, id);
        if (!broker)
            throw new NotFoundError('Broker not found');
        return broker;
    }
    async create(companyId, data) {
        return brokerRepository.create(companyId, data);
    }
    async update(companyId, id, data) {
        const existing = await brokerRepository.findById(companyId, id);
        if (!existing)
            throw new NotFoundError('Broker not found');
        return brokerRepository.update(companyId, id, data);
    }
    async delete(companyId, id) {
        const existing = await brokerRepository.findById(companyId, id);
        if (!existing)
            throw new NotFoundError('Broker not found');
        await brokerRepository.delete(companyId, id);
        return true;
    }
}
export const brokerService = new BrokerService();
