import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationRepository } from './notification.repository';

const { query, mockDb } = vi.hoisted(() => {
  const query = {
    where: vi.fn(),
    andWhere: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    orderBy: vi.fn(),
    select: vi.fn(),
    count: vi.fn(),
    first: vi.fn(),
    update: vi.fn(),
  };
  Object.values(query).forEach((method) => method.mockReturnValue(query));
  const mockDb = Object.assign(vi.fn(() => query), {
    fn: { now: vi.fn(() => 'now') },
  });
  return { query, mockDb };
});

vi.mock('../config/database', () => ({ default: mockDb }));

describe('NotificationRepository recipient scoping', () => {
  const repository = new NotificationRepository();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(query).forEach((method) => method.mockReturnValue(query));
  });

  it('only returns notifications owned by the authenticated user', async () => {
    query.select.mockResolvedValue([]);

    await repository.findByUserId('user-a', { limit: 10, offset: 0 });

    expect(query.where).toHaveBeenCalledWith({ user_id: 'user-a' });
  });

  it('requires both notification id and recipient id before marking read', async () => {
    query.update.mockResolvedValue(1);

    await repository.markAsRead('user-a', 'notification-b');

    expect(query.where).toHaveBeenCalledWith({ id: 'notification-b', user_id: 'user-a' });
    expect(query.update).toHaveBeenCalledWith({ is_read: true, read_at: 'now' });
  });

  it('limits mark-all-as-read to the recipient user', async () => {
    query.update.mockResolvedValue(2);

    await repository.markAllAsRead('user-a');

    expect(query.where).toHaveBeenCalledWith({ user_id: 'user-a', is_read: false });
  });
});
