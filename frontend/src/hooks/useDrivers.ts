import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '../api/drivers';
import { useToast } from '../contexts/ToastContext';

export const useDrivers = (params?: any) => {
  return useQuery({
    queryKey: ['drivers', params],
    queryFn: () => driversApi.getDrivers(params),
  });
};

export const useMyDriver = () => {
  return useQuery({
    queryKey: ['driver', 'me'],
    queryFn: () => driversApi.getMe(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

export const useDriver = (id: string) => {
  return useQuery({
    queryKey: ['driver', id],
    queryFn: () => driversApi.getDriverById(id),
    enabled: !!id,
  });
};

export const useCreateDriver = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (data: any) => driversApi.createDriver(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      showSuccess('Driver created successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to create driver');
    },
  });
};

export const useUpdateDriver = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => driversApi.updateDriver(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['driver', variables.id] });
      showSuccess('Driver updated successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to update driver');
    },
  });
};

export const useDeleteDriver = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (id: string) => driversApi.deleteDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      showSuccess('Driver deleted successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to delete driver');
    },
  });
};
