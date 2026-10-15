import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationService } from './notification.service';
import { notificationRepository } from '../repositories/notification.repository';

vi.mock('../repositories/notification.repository', () => ({
  notificationRepository: {
    create: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn(),
    countByUserId: vi.fn(),
    markAsRead: vi.fn(),
    existsForUser: vi.fn(),
    markAllAsRead: vi.fn(),
    getUnreadCount: vi.fn(),
  },
}));

describe('NotificationService.notifyAssignedDriver', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends only to an active same-company driver account', async () => {
    const query: any = {
      join: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ user_id: 'driver-user-a' }),
    };
    const executor: any = vi.fn(() => query);
    const service = new NotificationService();

    await service.notifyAssignedDriver('company-a', 'driver-a', {
      type: 'LOAD_DISPATCHED', title: 'Load dispatched', message: 'Load LD-A dispatched', loadId: 'load-a',
    }, executor);

    expect(query.where).toHaveBeenCalledWith({
      'drivers.id': 'driver-a',
      'drivers.company_id': 'company-a',
      'users.status': 'ACTIVE',
      'roles.name': 'DRIVER',
    });
    expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'driver-user-a',
      loadId: 'load-a',
      type: 'LOAD_DISPATCHED',
    }), executor);
  });

  it('does not notify when the driver is not connected to an authorized account', async () => {
    const query: any = {
      join: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    };
    const executor: any = vi.fn(() => query);
    const service = new NotificationService();

    await service.notifyAssignedDriver('company-a', 'driver-b', {
      type: 'LOAD_DISPATCHED', title: 'Load dispatched', message: 'Load LD-B dispatched',
    }, executor);

    expect(notificationRepository.create).not.toHaveBeenCalled();
  });
});