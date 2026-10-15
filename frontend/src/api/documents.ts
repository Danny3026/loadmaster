import apiClient from './client';

export const documentsApi = {
  uploadDocument: async (loadId: string, formData: FormData) => {
    const response = await apiClient.post(`/loads/${loadId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getDocumentsByLoad: async (loadId: string) => {
    const response = await apiClient.get(`/loads/${loadId}/documents`);
    return response.data;
  },
  getDocument: async (id: string) => {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data;
  },
  downloadDocument: async (id: string) => {
    const response = await apiClient.get(`/documents/${id}`, { responseType: 'blob' });
    return response.data;
  },
  deleteDocument: async (id: string) => {
    const response = await apiClient.delete(`/documents/${id}`);
    return response.data;
  },
  getExtractions: async (documentId: string) => {
    const response = await apiClient.get(`/documents/${documentId}/extractions`);
    return response.data;
  },
  verifyExtraction: async (documentId: string, data: any) => {
    const response = await apiClient.post(`/documents/${documentId}/verify`, data);
    return response.data;
  }
};
