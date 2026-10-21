import { z } from 'zod';

const truckInputSchema = z.object({
  unit_number: z.string().min(1).max(50).optional(),
  truck_number: z.string().min(1).max(50).optional(),
  vin: z.string().max(17).optional().nullable(),
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  type: z.enum(['DRY_VAN', 'FLATBED', 'REEFER', 'STEP_DECK', 'OTHER']),
  license_plate: z.string().max(20).optional().nullable(),
  plate_number: z.string().max(20).optional().nullable(),
  license_state: z.string().length(2).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'available', 'maintenance']).default('ACTIVE'),
  notes: z.string().max(1000).optional().nullable(),
});

const normalizeTruckInput = (input: Partial<z.input<typeof truckInputSchema>>) => {
  const { truck_number, plate_number, status, ...data } = input;
  return {
    ...data,
    ...(data.unit_number !== undefined || truck_number !== undefined
      ? { unit_number: data.unit_number ?? truck_number }
      : {}),
    ...(data.license_plate !== undefined || plate_number !== undefined
      ? { license_plate: data.license_plate ?? plate_number }
      : {}),
    ...(status !== undefined
      ? { status: status === 'available' ? 'ACTIVE' : status === 'maintenance' ? 'MAINTENANCE' : status }
      : {}),
  };
};

const createTruckBodySchema = truckInputSchema
  .refine((data) => Boolean(data.unit_number || data.truck_number), {
    message: 'truck_number is required',
    path: ['truck_number'],
  })
  .transform(normalizeTruckInput);

const updateTruckBodySchema = truckInputSchema.partial().transform(normalizeTruckInput);

export const createTruckSchema = z.object({
  body: createTruckBodySchema,
});

export const updateTruckSchema = z.object({
  body: updateTruckBodySchema,
  params: z.object({ id: z.string().uuid() }),
});
