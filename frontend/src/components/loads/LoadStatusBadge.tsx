import React from 'react';

type LoadStatus = 'pending' | 'dispatched' | 'in_transit' | 'delivered';

interface LoadStatusBadgeProps {
  status: LoadStatus;
  className?: string;
}

const statusConfig: Record<LoadStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  dispatched: { label: 'Dispatched', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  in_transit: { label: 'In Transit', bg: 'bg-purple-100', text: 'text-purple-800' },
  delivered: { label: 'Delivered', bg: 'bg-green-100', text: 'text-green-800' },
};

export const LoadStatusBadge: React.FC<LoadStatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}>
      {config.label}
    </span>
  );
};
