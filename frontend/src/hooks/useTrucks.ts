import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trucksApi } from '../api/trucks';
import { useToast } from '../contexts/ToastContext';

export const useTrucks = (params?: any) => {
  return useQuery({
    queryKey: ['trucks', params],
    queryFn: () => trucksApi.getTrucks(params),
  });
};

export const useTruck = (id: string) => {
  return useQuery({
    queryKey: ['truck', id],
    queryFn: () => trucksApi.getTruckById(id),
    enabled: !!id,
  });
};

export const useCreateTruck = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (data: any) => trucksApi.createTruck(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      showSuccess('Truck created successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to create truck');
    },
  });
};

export const useUpdateTruck = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => trucksApi.updateTruck(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      queryClient.invalidateQueries({ queryKey: ['truck', variables.id] });
      showSuccess('Truck updated successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to update truck');
    },
  });
};

export const useDeleteTruck = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (id: string) => trucksApi.deleteTruck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      showSuccess('Truck deleted successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to delete truck');
    },
  });
};
