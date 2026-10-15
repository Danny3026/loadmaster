import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../api/documents';
import { useToast } from '../contexts/ToastContext';

export const useDocumentsByLoad = (loadId: string) => {
  return useQuery({
    queryKey: ['documents', loadId],
    queryFn: () => documentsApi.getDocumentsByLoad(loadId),
    enabled: !!loadId,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ loadId, formData }: { loadId: string; formData: FormData }) => 
      documentsApi.uploadDocument(loadId, formData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', variables.loadId] });
      showSuccess('Document uploaded successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to upload document');
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, loadId }: { id: string, loadId: string }) => documentsApi.deleteDocument(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', variables.loadId] });
      showSuccess('Document deleted successfully');
    },
    onError: (error: any) => {
      showError(error.response?.data?.message || 'Failed to delete document');
    },
  });
};
