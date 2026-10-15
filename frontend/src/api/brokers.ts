import apiClient from './client';

export const brokersApi = {
  getBrokers: async (params?: any) => {
    const response = await apiClient.get('/brokers', { params });
    return response.data;
  },
  getBrokerById: async (id: string) => {
    const response = await apiClient.get(`/brokers/${id}`);
    return response.data;
  },
  createBroker: async (data: any) => {
    const response = await apiClient.post('/brokers', data);
    return response.data;
  },
  updateBroker: async (id: string, data: any) => {
    const response = await apiClient.put(`/brokers/${id}`, data);
    return response.data;
  },
  deleteBroker: async (id: string) => {
    const response = await apiClient.delete(`/brokers/${id}`);
    return response.data;
  }
};
