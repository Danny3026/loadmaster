import { brokerRepository } from '../repositories/broker.repository';
import { NotFoundError } from '../utils/errors';

export class BrokerService {
  async getAll(companyId: string, pagination: any) {
    const data = await brokerRepository.findAll(companyId, pagination);
    const total = await brokerRepository.count(companyId);
    return { data, total };
  }

  async getById(companyId: string, id: string) {
    const broker = await brokerRepository.findById(companyId, id);
    if (!broker) throw new NotFoundError('Broker not found');
    return broker;
  }

  async create(companyId: string, data: any) {
    return brokerRepository.create(companyId, data);
  }

  async update(companyId: string, id: string, data: any) {
    const existing = await brokerRepository.findById(companyId, id);
    if (!existing) throw new NotFoundError('Broker not found');
    return brokerRepository.update(companyId, id, data);
  }

  async delete(companyId: string, id: string) {
    const existing = await brokerRepository.findById(companyId, id);
    if (!existing) throw new NotFoundError('Broker not found');
    await brokerRepository.delete(companyId, id);
    return true;
  }
}

export const brokerService = new BrokerService();
