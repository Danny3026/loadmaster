import React from 'react';

export interface DriverTruckOption {
  id: string;
  unit_number: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

interface DriverTruckSelectorProps {
  value: string;
  trucks: DriverTruckOption[];
  loading: boolean;
  error: string;
  onChange: (truckId: string) => void;
  onRetry: () => void;
}

const statusLabels: Record<DriverTruckOption['status'], string> = {
  ACTIVE: 'Available',
  INACTIVE: 'Inactive',
  MAINTENANCE: 'Maintenance',
};

export const DriverTruckSelector: React.FC<DriverTruckSelectorProps> = ({
  value,
  trucks,
  loading,
  error,
  onChange,
  onRetry,
}) => (
  <div>
    <label htmlFor="driver-truck-id" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Truck</label>
    <select
      id="driver-truck-id"
      aria-label="Truck"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={loading || Boolean(error)}
      style={{ width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff' }}
    >
      <option value="">{loading ? 'Loading trucks...' : 'No truck assigned'}</option>
      {trucks.map((truck) => (
        <option key={truck.id} value={truck.id}>
          {truck.unit_number} ({statusLabels[truck.status]})
        </option>
      ))}
    </select>
    {error && (
      <div role="alert" style={{ marginTop: '6px', color: '#b91c1c', fontSize: '12px' }}>
        <span>{error}</span>{' '}
        <button type="button" onClick={onRetry} style={{ textDecoration: 'underline' }}>Retry</button>
      </div>
    )}
  </div>
);
