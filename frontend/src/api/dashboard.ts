import apiClient from './client';

export const dashboardApi = {
  getDashboardStats: async (filters?: { startDate?: string, endDate?: string, driverId?: string }) => {
    const response = await apiClient.get('/dashboard', { params: filters });
    return response.data;
  }
};
