import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { brokersApi } from '../api/brokers';
import { useToast } from '../contexts/ToastContext';

export const useBrokers = (params?: any) => {
  return useQuery({
    queryKey: ['brokers', params],
    queryFn: () => brokersApi.getBrokers(params),
  });
};

export const useBroker = (id: string) => {
  return useQuery({
    queryKey: ['broker', id],
    queryFn: () => brokersApi.getBrokerById(id),
    enabled: !!id,
  });
};

export const useCreateBroker = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (data: any) => brokersApi.createBroker(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      showSuccess('Broker created successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to create broker');
    },
  });
};

export const useUpdateBroker = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => brokersApi.updateBroker(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      queryClient.invalidateQueries({ queryKey: ['broker', variables.id] });
      showSuccess('Broker updated successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to update broker');
    },
  });
};

export const useDeleteBroker = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (id: string) => brokersApi.deleteBroker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      showSuccess('Broker deleted successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to delete broker');
    },
  });
};
