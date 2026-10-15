import { PaginationParams, PaginatedResponse } from '../types';

export const parsePaginationParams = (query: any): PaginationParams => {
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 10;
  const sortBy = query.sortBy as string | undefined;
  const sortOrder = (query.sortOrder === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  return { page, limit, sortBy, sortOrder };
};

export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> => {
  return {
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    },
  };
};
