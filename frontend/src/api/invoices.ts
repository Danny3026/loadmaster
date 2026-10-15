import apiClient from './client';

export interface Invoice {
  id: string;
  invoice_number: string;
  load_id: string;
  load_number: string;
  broker_id: string;
  broker_name: string;
  driver_id?: string;
  driver_first_name?: string;
  driver_last_name?: string;
  status: 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  rate: number;
  extras: number;
  total_amount: number;
  currency: string;
  payment_status: 'PAID' | 'UNPAID' | 'PARTIAL';
  invoice_date: string;
  date_factored?: string;
  invoice_sent_date?: string;
  payment_received_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const invoicesApi = {
  getInvoices: async (params?: any) => {
    const response = await apiClient.get<{
      data: Invoice[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>('/invoices', { params });
    return response.data;
  },

  getInvoiceById: async (id: string) => {
    const response = await apiClient.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  createInvoice: async (data: any) => {
    const response = await apiClient.post<Invoice>('/invoices', data);
    return response.data;
  },

  updateInvoice: async (id: string, data: any) => {
    const response = await apiClient.patch<Invoice>(`/invoices/${id}`, data);
    return response.data;
  },

  deleteInvoice: async (id: string) => {
    const response = await apiClient.delete(`/invoices/${id}`);
    return response.data;
  },

  markAsSent: async (id: string, invoiceSentDate?: string) => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/mark-sent`, {
      invoice_sent_date: invoiceSentDate,
    });
    return response.data;
  },

  markAsPaid: async (id: string, paymentReceivedDate?: string) => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/mark-paid`, {
      payment_received_date: paymentReceivedDate,
    });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get<any>('/invoices/stats');
    return response.data;
  },

  getTaxSummary: async (params?: any) => {
    const response = await apiClient.get<any>('/invoices/tax-summary', { params });
    return response.data.data || response.data;
  },

  validateTaxPreparation: async (driverId: string, params: any) => {
    const response = await apiClient.get<any>(`/invoices/tax-preparation/${driverId}/validate`, { params });
    return response.data.data || response.data;
  },

  getDevelopmentTaxFixture: async (taxYear: number) => {
    const response = await apiClient.get<any>('/invoices/tax-preparation/development-fixture', { params: { taxYear } });
    return response.data.data || response.data;
  },

  createTaxPreparation: async (data: {
    driverId?: string;
    taxYear: number;
    startDate: string;
    endDate: string;
    testOnly?: boolean;
    testMailingAddress?: string;
    expectedSnapshot: {
      testOnly: boolean;
      taxYear: number;
      startDate: string;
      endDate: string;
      payer: Record<string, unknown>;
      contractor: Record<string, unknown>;
      qualifyingPaidEarnings: number;
      paidSettlementCount: number;
    };
    pdfBase64: string;
  }) => {
    const response = await apiClient.post<any>('/invoices/tax-preparations', data);
    return response.data.data || response.data;
  },

  getTaxPreparations: async (taxYear: number) => {
    const response = await apiClient.get<any>('/invoices/tax-preparations', { params: { taxYear } });
    return response.data.data || response.data;
  },

  downloadTaxPreparation: async (id: string) => {
    const response = await apiClient.get<Blob>(`/invoices/tax-preparations/${id}/pdf`, { responseType: 'blob' });
    return response.data;
  },
};
