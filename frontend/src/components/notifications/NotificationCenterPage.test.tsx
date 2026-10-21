import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationCenterPage } from './NotificationCenterPage';

const { navigate, user } = vi.hoisted(() => ({
  navigate: vi.fn(),
  user: { role: 'DRIVER' as string },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user }),
}));

vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({ data: { data: [] }, isLoading: false, error: null, refetch: vi.fn() }),
  useUnreadNotificationCount: () => ({ data: 0 }),
  useMarkRead: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useMarkAllRead: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('./NotificationFeed', () => ({
  NotificationFeed: () => <div />,
}));

describe('NotificationCenterPage back navigation', () => {
  beforeEach(() => {
    navigate.mockClear();
    user.role = 'DRIVER';
  });

  it('returns drivers to their dashboard', () => {
    render(<NotificationCenterPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to driver page' }));
    expect(navigate).toHaveBeenCalledWith('/driver');
  });

  it('does not show the driver back button to admins', () => {
    user.role = 'ADMIN';
    render(<NotificationCenterPage />);
    expect(screen.queryByRole('button', { name: 'Back to driver page' })).toBeNull();
  });
});
