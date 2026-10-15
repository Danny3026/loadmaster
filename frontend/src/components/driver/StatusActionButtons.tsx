import React, { useState } from 'react';

type Status = 'PENDING' | 'DISPATCHED' | 'EN_ROUTE' | 'DELIVERED';

interface StatusActionButtonsProps {
  currentStatus: Status;
  onUpdate: (status: Status) => void;
}

export const StatusActionButtons: React.FC<StatusActionButtonsProps> = ({ currentStatus, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async (newStatus: Status) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      onUpdate(newStatus);
    } finally {
      setIsLoading(false);
    }
  };

  const renderButtons = () => {
    if (isLoading) {
      return (
        <div className="w-full py-3 flex justify-center items-center bg-gray-50 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Updating status...</span>
        </div>
      );
    }

    switch (currentStatus) {
      case 'PENDING':
        return (
          <button 
            onClick={() => handleUpdate('DISPATCHED')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Acknowledge Dispatch
          </button>
        );
      case 'DISPATCHED':
        return (
          <button 
            onClick={() => handleUpdate('EN_ROUTE')}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Start Route (Picked Up)
          </button>
        );
      case 'EN_ROUTE':
        return (
          <button 
            onClick={() => handleUpdate('DELIVERED')}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Confirm Delivery
          </button>
        );
      case 'DELIVERED':
        return (
          <div className="w-full py-3 bg-gray-100 text-green-700 rounded-lg font-medium text-center flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            Delivery Completed
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {renderButtons()}
    </div>
  );
};
