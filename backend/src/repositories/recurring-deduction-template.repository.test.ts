import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurringDeductionTemplateRepository } from './recurring-deduction-template.repository';

const { mockDb, mockQuery, mockScopeQuery } = vi.hoisted(() => {
  const mockScopeQuery = {
    whereNull: vi.fn().mockReturnThis(),
    orWhere: vi.fn().mockReturnThis(),
  };
  const rows = [
    { id: 'all-template', driver_id: null, amount: '500.00', is_active: true },
    { id: 'driver-template', driver_id: 'driver-1', amount: '150.00', is_active: true },
  ];
  const mockQuery: any = {
    where: vi.fn().mockImplementation((condition: any) => {
      if (typeof condition === 'function') condition(mockScopeQuery);
      return mockQuery;
    }),
    orderBy: vi.fn().mockReturnThis(),
    then: (resolve: (value: any) => void) => resolve(rows),
  };
  const mockDb = vi.fn(() => mockQuery);
  return { mockDb, mockQuery, mockScopeQuery };
});

vi.mock('../config/database', () => ({ default: mockDb }));

describe('RecurringDeductionTemplateRepository.findApplicable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters active templates to the company, all drivers, and the selected driver only', async () => {
    const repository = new RecurringDeductionTemplateRepository();

    const templates = await repository.findApplicable('company-1', 'driver-1');

    expect(mockDb).toHaveBeenCalledWith('recurring_deduction_templates');
    expect(mockQuery.where).toHaveBeenCalledWith({ company_id: 'company-1', is_active: true });
    expect(mockScopeQuery.whereNull).toHaveBeenCalledWith('driver_id');
    expect(mockScopeQuery.orWhere).toHaveBeenCalledWith('driver_id', 'driver-1');
    expect(templates.map((template: any) => template.id)).toEqual(['all-template', 'driver-template']);
    expect(templates.map((template: any) => template.amount)).toEqual([500, 150]);
  });
});
