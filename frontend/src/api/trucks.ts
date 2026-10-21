import apiClient from './client';

export const trucksApi = {
  getTrucks: async (params?: any) => {
    const response = await apiClient.get('/trucks', { params });
    return response.data;
  },
  getTruckById: async (id: string) => {
    const response = await apiClient.get(`/trucks/${id}`);
    return response.data;
  },
  createTruck: async (data: any) => {
    const response = await apiClient.post('/trucks', data);
    return response.data;
  },
  updateTruck: async (id: string, data: any) => {
    const response = await apiClient.patch(`/trucks/${id}`, data);
    return response.data;
  },
  deleteTruck: async (id: string) => {
    const response = await apiClient.delete(`/trucks/${id}`);
    return response.data;
  }
};
