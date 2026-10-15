import apiClient from './client';
import { Load } from '../types';

export const loadsApi = {
  getLoads: async (params?: any) => {
    const response = await apiClient.get<{ data: Load[]; total: number }>('/loads', { params });
    return response.data;
  },
  getLoadById: async (id: string) => {
    const response = await apiClient.get<Load>(`/loads/${id}`);
    return (response.data as any).data || response.data;
  },
  createLoad: async (data: any) => {
    const response = await apiClient.post<Load>('/loads', data);
    return response.data;
  },
  updateLoad: async (id: string, data: any) => {
    const response = await apiClient.patch<Load>(`/loads/${id}`, data);
    return response.data;
  },
  deleteLoad: async (id: string) => {
    const response = await apiClient.delete(`/loads/${id}`);
    return response.data;
  },
  archiveLoad: async (id: string) => {
    const response = await apiClient.post(`/loads/${id}/archive`);
    return response.data;
  },
  restoreLoad: async (id: string) => {
    const response = await apiClient.post(`/loads/${id}/restore`);
    return response.data;
  },
  getLoadStatusHistory: async (id: string) => {
    const response = await apiClient.get(`/loads/${id}/status-history`);
    return response.data;
  },
  assignLoad: async (id: string, data: any) => {
    const response = await apiClient.post(`/dispatch/loads/${id}/assign`, data);
    return response.data;
  },
  dispatchLoad: async (id: string) => {
    const response = await apiClient.post(`/dispatch/loads/${id}/dispatch`);
    return response.data;
  },
  unassignLoad: async (id: string) => {
    const response = await apiClient.post(`/dispatch/loads/${id}/unassign`);
    return response.data;
  },
  updateLoadStatus: async (id: string, status: any) => {
    const response = await apiClient.patch(`/dispatch/loads/${id}/status`, { status });
    return response.data;
  },
  getLoadDocuments: async (id: string) => {
    const response = await apiClient.get(`/loads/${id}/documents`);
    return response.data;
  },
  uploadLoadDocument: async (id: string, file: File, documentType: string, notes?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('notes', notes || '');
    const response = await apiClient.post(`/loads/${id}/documents`, formData);
    return response.data;
  },
};
