import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../api/invoices';
import { useToast } from '../contexts/ToastContext';

export const useInvoices = (filters?: any) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoicesApi.getInvoices(filters),
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getInvoiceById(id),
    enabled: !!id,
  });
};

export const useInvoiceStats = () => {
  return useQuery({
    queryKey: ['invoiceStats'],
    queryFn: () => invoicesApi.getStats(),
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (data: any) => invoicesApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceStats'] });
      showSuccess('Invoice created successfully');
    },
    onError: (error: any) => {
      console.error('Create invoice error', error);
      showError(error.response?.data?.error?.message || error.message || 'Failed to create invoice');
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => invoicesApi.updateInvoice(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['invoiceStats'] });
      showSuccess('Invoice updated successfully');
    },
    onError: (error: any) => {
      console.error('Update invoice error', error);
      showError(error.response?.data?.error?.message || error.message || 'Failed to update invoice');
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: (id: string) => invoicesApi.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceStats'] });
      showSuccess('Invoice deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete invoice error', error);
      showError(error.response?.data?.error?.message || error.message || 'Failed to delete invoice');
    },
  });
};

export const useMarkInvoiceAsSent = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, invoiceSentDate }: { id: string; invoiceSentDate?: string }) =>
      invoicesApi.markAsSent(id, invoiceSentDate),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
      showSuccess('Invoice marked as sent');
    },
    onError: (error: any) => {
      console.error('Mark as sent error', error);
      showError(error.response?.data?.error?.message || error.message || 'Failed to mark as sent');
    },
  });
};

export const useMarkInvoiceAsPaid = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: ({ id, paymentReceivedDate }: { id: string; paymentReceivedDate?: string }) =>
      invoicesApi.markAsPaid(id, paymentReceivedDate),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['invoiceStats'] });
      showSuccess('Invoice marked as paid');
    },
    onError: (error: any) => {
      console.error('Mark as paid error', error);
      showError(error.response?.data?.error?.message || error.message || 'Failed to mark as paid');
    },
  });
};
