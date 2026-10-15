import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadsApi } from '../api/loads';
import { useToast } from '../contexts/ToastContext';

export const useLoads = (filters?: any) => {
  return useQuery({
    queryKey: ['loads', filters],
    queryFn: () => loadsApi.getLoads(filters),
  });
};

export const useLoad = (id: string) => {
  return useQuery({
    queryKey: ['load', id],
    queryFn: () => loadsApi.getLoadById(id),
    enabled: !!id,
  });
};

export const useCreateLoad = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (data: any) => loadsApi.createLoad(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      showSuccess('Load created successfully. Review the saved load details.');
    },
    onError: (error: any) => {
      console.error('Create load error', error);
      showError(error.response?.data?.error?.message || error.message || 'Failed to create load');
    },
  });
};

export const useUpdateLoad = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => loadsApi.updateLoad(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['load', variables.id] });
      showSuccess('Load updated successfully');
    },
    onError: (error: any) => {
      console.error('Update load error', error);
      if (error.response?.data?.error?.details?.type === 'DRIVER_UNAVAILABLE') return;
      showError(error.response?.data?.error?.message || error.message || 'Failed to update load');
    },
  });
};

export const useDeleteLoad = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (id: string) => loadsApi.deleteLoad(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      showSuccess('Load deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete load error', error);
      showError(error.response?.data?.error?.message || error.message || 'Failed to delete load');
    },
  });
};

export const useAssignLoad = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any; loadNumber?: string }) => loadsApi.assignLoad(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['load', variables.id] });
      showSuccess(variables.data.dispatch
        ? `Load ${variables.loadNumber || ''} dispatched successfully.`.replace('  ', ' ')
        : 'Load assigned successfully');
    },
    onError: (error: any) => {
      console.error('Assign load error', error);
      if (error.response?.data?.error?.details?.type === 'DRIVER_UNAVAILABLE') return;
      showError(error.response?.data?.error?.message || error.message || 'Failed to assign load');
    },
  });
};

export const useDispatchLoad = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (id: string) => loadsApi.dispatchLoad(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['load', variables] });
      showSuccess('Load dispatched successfully');
    },
    onError: (error: any) => {
      console.error('Dispatch load error', error);
      showError(error.response?.data?.error?.message || error.message || 'Failed to dispatch load');
    },
  });
};

export const useUpdateLoadStatus = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => loadsApi.updateLoadStatus(id, status),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['load', variables.id] });
      showSuccess('Load status updated successfully');
    },
    onError: (error: any) => {
      console.error('Update load status error', error);
      showError(error.response?.data?.error?.message || error.message || 'Failed to update status');
    },
  });
};

export const useLoadDocuments = (id: string) => {
  return useQuery({
    queryKey: ['loadDocuments', id],
    queryFn: () => loadsApi.getLoadDocuments(id),
    enabled: !!id,
  });
};

export const useUploadLoadDocument = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, file, documentType, notes }: { id: string; file: File; documentType: string; notes?: string }) =>
      loadsApi.uploadLoadDocument(id, file, documentType, notes),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loadDocuments', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['load', variables.id] });
      showSuccess('Document uploaded successfully');
    },
    onError: (error: any) => showError(error.response?.data?.error?.message || 'Failed to upload document'),
  });
};
