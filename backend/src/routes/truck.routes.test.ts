import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('../controllers/truck.controller', () => ({
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteTruck: vi.fn(),
}));
vi.mock('../middleware/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('../middleware/tenant', () => ({ requireTenant: vi.fn() }));
vi.mock('../middleware/rbac', () => ({ requireRole: vi.fn(() => vi.fn()) }));
vi.mock('../middleware/validator', () => ({ validate: vi.fn(() => vi.fn()) }));
import truckRoutes from './truck.routes';

describe('truck routes', () => {
  it('supports PUT updates while retaining PATCH compatibility', () => {
    const truckItemRoutes = (truckRoutes as any).stack
      .filter((layer: any) => layer.route?.path === '/:id')
      .flatMap((layer: any) => layer.route.stack.map((handler: any) => ({
        method: handler.method,
        name: handler.name,
      })));

    expect(truckItemRoutes.some((route: any) => route.method === 'put')).toBe(true);
    expect(truckItemRoutes.some((route: any) => route.method === 'patch')).toBe(true);
  });
});
