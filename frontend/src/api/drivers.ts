import apiClient from './client';

export const driversApi = {
  getMe: async () => {
    const response = await apiClient.get('/drivers/me');
    return response.data.data;
  },
  getMyProfilePhoto: async () => {
    const response = await apiClient.get('/drivers/me/profile-photo', { responseType: 'blob' });
    return response.data as Blob;
  },
  uploadMyProfilePhoto: async (file: File, onUploadProgress?: (loaded: number, total?: number) => void) => {
    const body = new FormData();
    body.append('file', file);
    const response = await apiClient.post('/drivers/me/profile-photo', body, {
      onUploadProgress: (event) => onUploadProgress?.(event.loaded, event.total),
    });
    return response.data.data;
  },
  getDrivers: async (params?: any) => {
    const response = await apiClient.get('/drivers', { params });
    return response.data;
  },
  getDriverById: async (id: string) => {
    const response = await apiClient.get(`/drivers/${id}`);
    return response.data;
  },
  createDriver: async (data: any) => {
    const response = await apiClient.post('/drivers', data);
    return response.data;
  },
  updateDriver: async (id: string, data: any) => {
    const response = await apiClient.patch(`/drivers/${id}`, data);
    return response.data;
  },
  extractCdl: async (id: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    const response = await apiClient.post(`/drivers/${id}/extract-cdl`, body);
    return response.data;
  },
  getAvailabilityTimeline: async (startDate: string, endDate: string) => {
    const response = await apiClient.get('/drivers/availability/timeline', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },
  getAvailability: async (id: string) => {
    const response = await apiClient.get(`/drivers/${id}/availability`);
    return response.data;
  },
  createAvailability: async (id: string, data: any) => {
    const response = await apiClient.post(`/drivers/${id}/availability`, data);
    return response.data;
  },
  updateAvailability: async (id: string, availabilityId: string, data: any) => {
    const response = await apiClient.patch(`/drivers/${id}/availability/${availabilityId}`, data);
    return response.data;
  },
  deleteAvailability: async (id: string, availabilityId: string) => {
    const response = await apiClient.delete(`/drivers/${id}/availability/${availabilityId}`);
    return response.data;
  },
  deleteDriver: async (id: string) => {
    const response = await apiClient.delete(`/drivers/${id}`);
    return response.data;
  }
};
