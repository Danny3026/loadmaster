import apiClient from './client';
import { User } from '../types';

export const usersApi = {
  getUsers: async (params?: any) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },
  getUserById: async (id: string) => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },
  createUser: async (data: any) => {
    const response = await apiClient.post<User>('/users', data);
    return response.data;
  },
  updateUser: async (id: string, data: any) => {
    const response = await apiClient.patch<User>(`/users/${id}`, data);
    return response.data;
  },
  deleteUser: async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  }
};
