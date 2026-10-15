import React from 'react';
import { LoadStatusBadge } from './LoadStatusBadge';

export interface Load {
  id: string;
  loadNumber: string;
  origin: string;
  destination: string;
  pickupDate: string;
  deliveryDate: string;
  status: 'pending' | 'dispatched' | 'in_transit' | 'delivered';
  rate: number;
}

interface LoadTableProps {
  loads: Load[];
  isLoading: boolean;
  onRowClick?: (load: Load) => void;
}

export const LoadTable: React.FC<LoadTableProps> = ({ loads, isLoading, onRowClick }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!loads || loads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-lg">No loads found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Load #</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Origin</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Destination</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Dates</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {loads.map((load) => (
            <tr 
              key={load.id} 
              onClick={() => onRowClick && onRowClick(load)}
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}
            >
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{load.loadNumber}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{load.origin}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{load.destination}</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <div>{new Date(load.pickupDate).toLocaleDateString()}</div>
                <div className="text-xs text-gray-400">to {new Date(load.deliveryDate).toLocaleDateString()}</div>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <LoadStatusBadge status={load.status} />
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${load.rate.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
