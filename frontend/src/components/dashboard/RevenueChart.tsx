import React from 'react';

export interface RevenueData {
  month: string;
  revenue: number;
}

export interface RevenueChartProps {
  data: RevenueData[];
  isLoading?: boolean;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse h-80 flex flex-col">
        <div className="h-5 bg-gray-200 rounded w-1/4 mb-8"></div>
        <div className="flex-1 flex space-x-3 items-end">
          {[1, 2, 3, 4, 5, 6].map(i => (
             <div key={i} className="flex-1 bg-gray-200 rounded-t h-full opacity-50"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex items-center justify-center">
        <p className="text-gray-500">No revenue data available</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Revenue Trend</h3>
      <div className="flex-1 flex space-x-2 sm:space-x-4 items-end mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
            {/* Tooltip */}
            <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-gray-800 text-white text-xs py-1 px-2 rounded transition-opacity pointer-events-none whitespace-nowrap z-10">
              ${item.revenue.toLocaleString()}
            </div>
            
            <div 
              className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t-sm transition-all duration-300 relative"
              style={{ height: `${(item.revenue / maxRevenue) * 100}%`, minHeight: '4px' }}
            >
              {/* Optional subtle gradient or pattern could go here */}
            </div>
            <div className="text-xs text-gray-500 mt-3 truncate w-full text-center">{item.month}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
