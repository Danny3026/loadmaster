import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentService } from './document.service';
import { DocumentExtractionRepository } from '../repositories/document-extraction.repository';

const { mockDb, mockLoadQuery, mockExtractionQuery } = vi.hoisted(() => {
  const mockLoadQuery = {
    where: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
  };
  const mockExtractionQuery = {
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };
  const mockDb: any = vi.fn((table: string) => {
    if (table === 'loads') return mockLoadQuery;
    if (table === 'document_extractions') return mockExtractionQuery;
    throw new Error(`Unexpected table ${table}`);
  });
  mockDb.fn = { now: vi.fn() };
  return { mockDb, mockLoadQuery, mockExtractionQuery };
});

vi.mock('../config/database', () => ({ default: mockDb }));

describe('document tenant guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadQuery.first.mockResolvedValue(null);
    mockExtractionQuery.returning.mockResolvedValue([]);
  });

  it('rejects upload when the target load is not owned by the tenant', async () => {
    const service = new DocumentService();

    await expect(service.upload(
      'company-a',
      'load-b',
      'user-a',
      { originalname: 'proof.pdf', buffer: Buffer.from('test'), size: 4, mimetype: 'application/pdf' } as any,
      'POD'
    )).rejects.toThrow('Load not found');

    expect(mockLoadQuery.where).toHaveBeenCalledWith({ id: 'load-b', company_id: 'company-a' });
  });

  it('updates only an extraction belonging to the authorized document', async () => {
    const repository = new DocumentExtractionRepository();

    await repository.verify('extraction-b', 'document-a', 'verified', 'user-a');

    expect(mockExtractionQuery.where).toHaveBeenCalledWith({ id: 'extraction-b', document_id: 'document-a' });
  });
});