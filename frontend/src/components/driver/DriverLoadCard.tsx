import React from 'react';
import { StatusActionButtons } from './StatusActionButtons';
import { MobileDocUpload } from './MobileDocUpload';

export interface LoadDetails {
  id: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: string;
  dropoffTime: string;
  status: 'PENDING' | 'DISPATCHED' | 'EN_ROUTE' | 'DELIVERED';
  weight: string;
  commodity: string;
}

interface DriverLoadCardProps {
  load: LoadDetails | null;
  onStatusUpdate: (id: string, newStatus: LoadDetails['status']) => void;
  onDocUpload: (id: string, file: File) => void;
}

export const DriverLoadCard: React.FC<DriverLoadCardProps> = ({ load, onStatusUpdate, onDocUpload }) => {
  if (!load) {
    return (
      <div className="flex justify-center items-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 font-medium">No load currently assigned.</p>
      </div>
    );
  }

  const getStatusColor = (status: LoadDetails['status']) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'DISPATCHED': return 'bg-blue-100 text-blue-800';
      case 'EN_ROUTE': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 w-full max-w-md mx-auto">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Load #{load.id}</h2>
            <p className="text-sm text-gray-500 mt-1">{load.commodity} • {load.weight}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(load.status)}`}>
            {load.status.replace('_', ' ')}
          </span>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <div className="h-4 w-4 rounded-full bg-blue-500"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Pickup</p>
              <p className="text-sm text-gray-600">{load.pickupLocation}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(load.pickupTime).toLocaleString()}</p>
            </div>
          </div>
          
          <div className="ml-2 border-l-2 border-gray-200 h-6"></div>

          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <div className="h-4 w-4 rounded-full border-2 border-green-500 bg-white"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-900">Dropoff</p>
              <p className="text-sm text-gray-600">{load.dropoffLocation}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(load.dropoffTime).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-4">
          <StatusActionButtons 
            currentStatus={load.status} 
            onUpdate={(status) => onStatusUpdate(load.id, status)} 
          />
          
          {load.status === 'DELIVERED' && (
            <MobileDocUpload onUpload={(file) => onDocUpload(load.id, file)} />
          )}
        </div>
      </div>
    </div>
  );
};
