import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loadSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  origin: z.string().min(2, 'Origin is required'),
  destination: z.string().min(2, 'Destination is required'),
  pickupDate: z.string().min(1, 'Pickup date is required'),
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  weight: z.number().min(1, 'Weight must be greater than 0'),
  rate: z.number().min(0, 'Rate cannot be negative'),
  notes: z.string().optional(),
});

type LoadFormData = z.infer<typeof loadSchema>;

interface LoadFormProps {
  initialData?: Partial<LoadFormData>;
  onSubmit: (data: LoadFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const LoadForm: React.FC<LoadFormProps> = ({ initialData, onSubmit, onCancel, isLoading = false }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoadFormData>({
    resolver: zodResolver(loadSchema),
    defaultValues: {
      customerName: initialData?.customerName || '',
      origin: initialData?.origin || '',
      destination: initialData?.destination || '',
      pickupDate: initialData?.pickupDate || '',
      deliveryDate: initialData?.deliveryDate || '',
      weight: initialData?.weight || 0,
      rate: initialData?.rate || 0,
      notes: initialData?.notes || '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow border border-gray-200">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Customer Name</label>
          <div className="mt-1">
            <input
              type="text"
              id="customerName"
              {...register('customerName')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
            {errors.customerName && <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="origin" className="block text-sm font-medium text-gray-700">Origin</label>
          <div className="mt-1">
            <input
              type="text"
              id="origin"
              {...register('origin')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
            {errors.origin && <p className="mt-1 text-sm text-red-600">{errors.origin.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="destination" className="block text-sm font-medium text-gray-700">Destination</label>
          <div className="mt-1">
            <input
              type="text"
              id="destination"
              {...register('destination')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
            {errors.destination && <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="pickupDate" className="block text-sm font-medium text-gray-700">Pickup Date</label>
          <div className="mt-1">
            <input
              type="date"
              id="pickupDate"
              {...register('pickupDate')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
            {errors.pickupDate && <p className="mt-1 text-sm text-red-600">{errors.pickupDate.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700">Delivery Date</label>
          <div className="mt-1">
            <input
              type="date"
              id="deliveryDate"
              {...register('deliveryDate')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
            {errors.deliveryDate && <p className="mt-1 text-sm text-red-600">{errors.deliveryDate.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Weight (lbs)</label>
          <div className="mt-1">
            <input
              type="number"
              id="weight"
              {...register('weight', { valueAsNumber: true })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
            {errors.weight && <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="rate" className="block text-sm font-medium text-gray-700">Rate ($)</label>
          <div className="mt-1">
            <input
              type="number"
              step="0.01"
              id="rate"
              {...register('rate', { valueAsNumber: true })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
            {errors.rate && <p className="mt-1 text-sm text-red-600">{errors.rate.message}</p>}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
          <div className="mt-1">
            <textarea
              id="notes"
              rows={3}
              {...register('notes')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Load'}
        </button>
      </div>
    </form>
  );
};
