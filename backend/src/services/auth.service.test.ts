import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { registerSchema } from '../validators/auth.validator';

const { mockDb, mockTrx, mockUsersQuery, mockCompaniesQuery, mockRolesQuery } = vi.hoisted(() => {
  const mockUsersQuery = {
    whereRaw: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    insert: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{
      id: 'owner-id',
      company_id: 'new-company-id',
      role_id: 'admin-role-id',
      email: 'owner@example.com',
      password_hash: 'argon-hash',
      first_name: 'Company',
      last_name: 'Owner',
      status: 'ACTIVE',
      must_change_password: false,
    }]),
  };
  const mockCompaniesQuery = {
    insert: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'new-company-id' }]),
  };
  const mockRolesQuery = {
    where: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue({ id: 'admin-role-id' }),
  };
  const mockTrx: any = vi.fn((table: string) => {
    if (table === 'users') return mockUsersQuery;
    if (table === 'companies') return mockCompaniesQuery;
    if (table === 'roles') return mockRolesQuery;
    throw new Error(`Unexpected table ${table}`);
  });
  mockTrx.raw = vi.fn().mockResolvedValue(undefined);
  const mockDb: any = Object.assign(vi.fn(), {
    transaction: vi.fn(async (callback: (trx: any) => unknown) => callback(mockTrx)),
  });
  return { mockDb, mockTrx, mockUsersQuery, mockCompaniesQuery, mockRolesQuery };
});

vi.mock('../config/database', () => ({ default: mockDb }));
vi.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_EXPIRES_IN: '5m',
    JWT_REFRESH_EXPIRES_IN: '1d',
  },
}));

describe('AuthService.register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersQuery.first.mockResolvedValue(null);
    mockUsersQuery.returning.mockResolvedValue([{
      id: 'owner-id',
      company_id: 'new-company-id',
      role_id: 'admin-role-id',
      email: 'owner@example.com',
      password_hash: 'argon-hash',
      first_name: 'Company',
      last_name: 'Owner',
      status: 'ACTIVE',
      must_change_password: false,
    }]);
    mockCompaniesQuery.returning.mockResolvedValue([{ id: 'new-company-id' }]);
    mockRolesQuery.first.mockResolvedValue({ id: 'admin-role-id' });
  });

  it('creates a company and its server-assigned admin owner in one transaction', async () => {
    const service = new AuthService();

    const result = await service.register({
      companyName: 'New Transport LLC',
      firstName: 'Company',
      lastName: 'Owner',
      email: ' OWNER@EXAMPLE.COM ',
      password: 'strong-password-123',
    });

    expect(mockDb.transaction).toHaveBeenCalledOnce();
    expect(mockTrx.raw).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock(hashtext(?))', ['owner@example.com']);
    expect(mockCompaniesQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Transport LLC',
      email: 'owner@example.com',
      status: 'ACTIVE',
    }));
    expect(mockUsersQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      company_id: 'new-company-id',
      role_id: 'admin-role-id',
      email: 'owner@example.com',
      first_name: 'Company',
      last_name: 'Owner',
      status: 'ACTIVE',
      must_change_password: false,
    }));
    expect(result.user).not.toHaveProperty('password_hash');
    expect(result.user.role).toBe('ADMIN');
    expect(jwt.verify(result.token, 'test-access-secret')).toEqual(expect.objectContaining({
      userId: 'owner-id',
      companyId: 'new-company-id',
      role: 'ADMIN',
    }));
  });

  it('rejects a duplicate email before creating a company', async () => {
    mockUsersQuery.first.mockResolvedValue({ id: 'existing-user' });
    const service = new AuthService();

    await expect(service.register({
      companyName: 'New Transport LLC',
      firstName: 'Company',
      lastName: 'Owner',
      email: 'owner@example.com',
      password: 'strong-password-123',
    })).rejects.toThrow('An account with this email already exists');

    expect(mockCompaniesQuery.insert).not.toHaveBeenCalled();
    expect(mockUsersQuery.insert).not.toHaveBeenCalled();
  });

  it('strips client-supplied company and role fields from registration input', () => {
    const parsed = registerSchema.parse({
      body: {
        companyName: 'Company A',
        firstName: 'Owner',
        lastName: 'A',
        email: 'owner-a@example.com',
        password: 'strong-password-123',
        companyId: 'company-b',
        role: 'ADMIN',
        role_id: 'foreign-role-id',
      },
    });

    expect(parsed.body).not.toHaveProperty('companyId');
    expect(parsed.body).not.toHaveProperty('role');
    expect(parsed.body).not.toHaveProperty('role_id');
  });
});