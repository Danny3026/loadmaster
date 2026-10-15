import apiClient from './client';

export const reportsApi = {
  getLoadsReport: async (params?: any) => {
    const response = await apiClient.get('/reports/loads', { params });
    return response.data;
  },
  getRevenueReport: async (params?: any) => {
    const response = await apiClient.get('/reports/revenue', { params });
    return response.data;
  },
  getDriversReport: async (params?: any) => {
    const response = await apiClient.get('/reports/drivers', { params });
    return response.data;
  },
  getMissingDocuments: async (params?: any) => {
    const response = await apiClient.get('/reports/missing-documents', { params });
    return response.data;
  },
  exportLoadsCSV: async (params?: any) => {
    const response = await apiClient.get('/reports/export', { params, responseType: 'blob' });
    return response.data;
  }
};
