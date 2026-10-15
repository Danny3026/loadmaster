import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationFeed } from './NotificationFeed';
import { NotificationRecord } from '../../api/notifications';

const notification: NotificationRecord = {
  id: 'notification-1',
  type: 'LOAD_ASSIGNED',
  title: 'New load assigned',
  message: 'Load LD-123 has been assigned to you.',
  isRead: false,
  createdAt: '2026-10-01T10:00:00.000Z',
  readAt: null,
  loadId: 'load-1',
  relatedEntityType: 'LOAD',
  relatedEntityId: 'load-1',
  priority: 'NORMAL',
};

describe('NotificationFeed', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('shows the caught-up empty state', async () => {
    await act(async () => root.render(
      <NotificationFeed
        notifications={[]}
        isLoading={false}
        error={null}
        onOpen={vi.fn()}
        onMarkRead={vi.fn()}
      />
    ));

    expect(container.textContent).toContain("You're all caught up");
  });

  it('shows unread state and marks an item as read on request', async () => {
    const onMarkRead = vi.fn();
    await act(async () => root.render(
      <NotificationFeed
        notifications={[notification]}
        isLoading={false}
        error={null}
        onOpen={vi.fn()}
        onMarkRead={onMarkRead}
      />
    ));

    expect(container.textContent).toContain('New load assigned');
    expect(container.textContent).toContain('Mark as read');
    await act(async () => {
      [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Mark as read'))?.click();
    });
    expect(onMarkRead).toHaveBeenCalledWith('notification-1');
  });
});
