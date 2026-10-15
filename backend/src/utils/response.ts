import { ApiResponse, PaginatedResponse } from '../types';

export const success = <T>(data: T, meta?: any): ApiResponse<T> => {
  return {
    success: true,
    data,
    meta,
  };
};

export const error = (message: string, code?: string, details?: any): ApiResponse<null> => {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };
};

export const paginated = <T>(paginatedData: PaginatedResponse<T>): ApiResponse<T[]> => {
  return {
    success: true,
    data: paginatedData.data,
    meta: paginatedData.meta,
  };
};
