import apiClient from './client';
import { User } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface LoginPayload {
  token: string;
  user: User;
  refreshToken?: string;
}

const normalizeUser = (user: any): User => ({
  ...user,
  firstName: user.firstName || user.first_name || '',
  lastName: user.lastName || user.last_name || '',
  companyId: user.companyId || user.company_id,
  mustChangePassword: user.mustChangePassword ?? user.must_change_password ?? false,
});

export const authApi = {
  register: async (details: {
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    const response = await apiClient.post<ApiResponse<LoginPayload>>('/auth/register', details);
    const data = response.data.data;
    return { ...data, user: normalizeUser(data.user) };
  },
  login: async (credentials: any) => {
    const response = await apiClient.post<ApiResponse<LoginPayload>>('/auth/login', credentials);
    const data = response.data.data;
    return { ...data, user: normalizeUser(data.user) };
  },
  refresh: async (refreshToken: string) => {
    const response = await apiClient.post<ApiResponse<LoginPayload>>('/auth/refresh', { refreshToken });
    return { ...response.data.data, user: normalizeUser(response.data.data.user) };
  },
  getMe: async () => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return normalizeUser(response.data.data);
  },
  forgotPassword: async (email: string) => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (data: any) => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/reset-password', data);
    return response.data;
  },
  changePassword: async (data: { currentPassword?: string; newPassword: string; confirmPassword: string }) => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/change-password', data);
    return response.data;
  },
};
