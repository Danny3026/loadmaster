import React, { useState } from 'react';

interface AssignmentData {
  driverId: string;
  truckId: string;
  trailerId?: string;
}

interface AssignmentFormProps {
  drivers: { id: string; name: string }[];
  trucks: { id: string; number: string }[];
  trailers?: { id: string; number: string }[];
  initialData?: AssignmentData;
  onSubmit: (data: AssignmentData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const AssignmentForm: React.FC<AssignmentFormProps> = ({ 
  drivers, 
  trucks, 
  trailers = [], 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<AssignmentData>({
    driverId: initialData?.driverId || '',
    truckId: initialData?.truckId || '',
    trailerId: initialData?.trailerId || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Resources</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Driver</label>
        <select
          value={formData.driverId}
          onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          required
        >
          <option value="">Select a driver</option>
          {drivers.map(driver => (
            <option key={driver.id} value={driver.id}>{driver.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Truck</label>
        <select
          value={formData.truckId}
          onChange={(e) => setFormData({ ...formData, truckId: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          required
        >
          <option value="">Select a truck</option>
          {trucks.map(truck => (
            <option key={truck.id} value={truck.id}>{truck.number}</option>
          ))}
        </select>
      </div>

      {trailers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Trailer (Optional)</label>
          <select
            value={formData.trailerId}
            onChange={(e) => setFormData({ ...formData, trailerId: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          >
            <option value="">None / Select later</option>
            {trailers.map(trailer => (
              <option key={trailer.id} value={trailer.id}>{trailer.number}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
        <button 
          type="button" 
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button 
          type="submit"
          disabled={isLoading || !formData.driverId || !formData.truckId}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Assigning...' : 'Confirm Assignment'}
        </button>
      </div>
    </form>
  );
};
