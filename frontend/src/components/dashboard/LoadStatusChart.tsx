import React from 'react';

export interface LoadStatusData {
  status: string;
  count: number;
  color: string; // e.g. 'bg-green-500'
}

export interface LoadStatusChartProps {
  data: LoadStatusData[];
  isLoading?: boolean;
}

export const LoadStatusChart: React.FC<LoadStatusChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse h-64">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="flex space-x-4 h-40 items-end justify-center">
          <div className="w-12 bg-gray-200 rounded-t"></div>
          <div className="w-12 bg-gray-200 rounded-t"></div>
          <div className="w-12 bg-gray-200 rounded-t"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-64 flex items-center justify-center">
        <p className="text-gray-500">No load status data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Load Status Overview</h3>
      <div className="flex space-x-6 items-end justify-center h-40">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center group relative">
            {/* Tooltip */}
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 text-white text-xs py-1 px-2 rounded transition-opacity pointer-events-none whitespace-nowrap">
              {item.count} Loads
            </div>
            
            <div className="text-xs text-gray-500 mb-2 font-medium">{item.count}</div>
            <div 
              className={`w-12 rounded-t-md transition-all duration-500 ease-in-out ${item.color}`}
              style={{ height: `${(item.count / maxCount) * 100}%`, minHeight: '4px' }}
            ></div>
            <div className="text-xs font-medium text-gray-600 mt-2 truncate w-16 text-center">{item.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
