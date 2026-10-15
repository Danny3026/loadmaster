import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '../api/companies';
import { useToast } from '../contexts/ToastContext';

export const useCompany = () => useQuery({
  queryKey: ['company'],
  queryFn: companiesApi.getCurrentCompany,
});

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (data: any) => companiesApi.updateCurrentCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      showSuccess('Company settings saved successfully');
    },
    onError: (error: any) => {
      showError(error?.response?.data?.error?.message || 'Failed to save company settings');
    },
  });
};

export const useUploadCompanyLogo = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (file: File) => companiesApi.uploadLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      showSuccess('Company logo uploaded successfully');
    },
    onError: (error: any) => {
      showError(error?.response?.data?.error?.message || 'Failed to upload logo');
    },
  });
};
