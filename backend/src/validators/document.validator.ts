import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  body: z.object({
    document_type: z.enum([
      'RATE_CONFIRMATION', 'BOL', 'POD', 'LUMPER_RECEIPT', 'DELIVERY_RECEIPT', 'OTHER'
    ]),
    notes: z.string().optional(),
  }),
});
