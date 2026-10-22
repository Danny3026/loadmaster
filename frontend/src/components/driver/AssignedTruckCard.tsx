import React from 'react';
import { Truck } from 'lucide-react';
import { DriverProfile } from '../../types/driverProfile';

interface AssignedTruckCardProps {
  driver?: DriverProfile;
  isLoading?: boolean;
  error?: unknown;
}

export const AssignedTruckCard: React.FC<AssignedTruckCardProps> = ({ driver, isLoading, error }) => (
  <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm" aria-labelledby="assigned-truck-heading">
    <div className="mb-4 flex items-center gap-2">
      <Truck className="text-blue-600" size={19} aria-hidden="true" />
      <h2 id="assigned-truck-heading" className="text-sm font-bold uppercase tracking-wider text-gray-500">Assigned truck</h2>
    </div>
    {isLoading ? <p className="text-sm text-gray-500">Loading assigned truck...</p> : error ? (
      <p className="text-sm text-red-600" role="alert">Unable to load your assigned truck.</p>
    ) : !driver?.assigned_truck_id ? (
      <p className="text-sm font-medium text-gray-600">No truck currently assigned.</p>
    ) : (
      <div>
        <p className="text-lg font-bold text-gray-900">
          {driver.truck_unit_number ? `Unit ${driver.truck_unit_number}` : 'Assigned truck'}
          {driver.truck_year && ` · ${driver.truck_year}`}
          {driver.truck_make && ` ${driver.truck_make}`}
          {driver.truck_model && ` ${driver.truck_model}`}
        </p>
        {driver.truck_license_plate && (
          <p className="mt-1 text-sm text-gray-600">
            Registration: {driver.truck_license_plate}{driver.truck_license_state ? ` (${driver.truck_license_state})` : ''}
          </p>
        )}
        {driver.truck_type && <p className="mt-1 text-sm text-gray-600">Type: {driver.truck_type.replace(/_/g, ' ')}</p>}
        {driver.truck_status && <p className="mt-1 text-sm text-gray-600">Status: {driver.truck_status.replace(/_/g, ' ')}</p>}
      </div>
    )}
  </section>
);

export default AssignedTruckCard;
