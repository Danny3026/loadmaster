import React from 'react';

export interface Activity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'load_created' | 'load_delivered' | 'payment_received' | 'alert';
}

export interface RecentActivityProps {
  activities: Activity[];
  isLoading?: boolean;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-start space-x-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-64 flex items-center justify-center">
        <p className="text-gray-500">No recent activity found</p>
      </div>
    );
  }

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'load_created': 
        return <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-100">LC</div>;
      case 'load_delivered': 
        return <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-bold text-xs border border-green-100">LD</div>;
      case 'payment_received': 
        return <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs border border-purple-100">PR</div>;
      case 'alert': 
        return <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold text-xs border border-red-100">!</div>;
      default: 
        return <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 font-bold text-xs border border-gray-100">--</div>;
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Recent Activity</h3>
      <div className="space-y-6">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {activity.title}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {activity.description}
              </p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {activity.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full mt-6 py-2 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors border border-indigo-50 rounded-lg hover:bg-indigo-50">
        View All Activity
      </button>
    </div>
  );
};
