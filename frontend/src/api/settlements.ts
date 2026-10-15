import apiClient from './client';

export const settlementsApi = {
  getMySettlements: async () => {
    const response = await apiClient.get('/settlements/mine');
    return response.data;
  },
  getSettlementById: async (settlementId: string) => {
    const response = await apiClient.get(`/settlements/${settlementId}`);
    return response.data;
  },
  getSettlements: async (params?: any) => {
    const response = await apiClient.get('/settlements', { params });
    return response.data;
  },
  reconcile: async (driverId: string, startDate: string, endDate: string) => {
    const response = await apiClient.get('/settlements/reconcile', {
      params: {
        driverId,
        startDate,
        endDate,
      },
    });
    return response.data;
  },
  create: async (payload: any) => {
    const response = await apiClient.post('/settlements', payload);
    return response.data;
  },
  getAdjustments: async (settlementId: string) => {
    const response = await apiClient.get(`/settlements/${settlementId}/adjustments`);
    return response.data;
  },
  addAdjustment: async (settlementId: string, payload: any) => {
    const response = await apiClient.post(`/settlements/${settlementId}/adjustments`, payload);
    return response.data;
  },
  getRecurringDeductions: async () => {
    const response = await apiClient.get('/settlements/recurring-deductions');
    return response.data;
  },
  createRecurringDeduction: async (payload: any) => {
    const response = await apiClient.post('/settlements/recurring-deductions', payload);
    return response.data;
  },
  updateRecurringDeduction: async (id: string, payload: any) => {
    const response = await apiClient.patch(`/settlements/recurring-deductions/${id}`, payload);
    return response.data;
  },
  deleteRecurringDeduction: async (id: string) => {
    const response = await apiClient.delete(`/settlements/recurring-deductions/${id}`);
    return response.data;
  },
  updateStatus: async (settlementId: string, status: string) => {
    const response = await apiClient.patch(`/settlements/${settlementId}/status`, { status });
    return response.data;
  },
  markPaid: async (settlementId: string) => {
    const response = await apiClient.post(`/settlements/${settlementId}/mark-paid`);
    return response.data;
  },
};
