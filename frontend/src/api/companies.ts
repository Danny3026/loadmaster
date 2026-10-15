import apiClient from './client';
import { Company } from '../types';

export const companiesApi = {
  getCurrentCompany: async () => {
    const response = await apiClient.get<{ data: Company }>('/companies/me');
    return response.data.data;
  },
  updateCurrentCompany: async (data: Partial<Company> & { tin?: string | null }) => {
    const response = await apiClient.put<{ data: Company }>('/companies/me', data);
    return response.data.data;
  },
  getPayerEinForTaxDocument: async () => {
    const response = await apiClient.get<{ data: { tin: string | null } }>('/companies/me/payer-ein');
    return response.data.data.tin;
  },
  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await apiClient.post<{ data: Company }>('/companies/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};
