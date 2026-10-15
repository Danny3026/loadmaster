import React, { useState, useEffect } from 'react';
import { 
  Activity, Search, Filter, Download, 
  Terminal, Shield, User, Globe
} from 'lucide-react';

interface LogEntry {
  id: string;
  action: string;
  user: string;
  resource: string;
  ip: string;
  status: 'Success' | 'Failed' | 'Warning';
  timestamp: string;
}

const mockLogs: LogEntry[] = [
  { id: '101', action: 'User Login', user: 'admin@system.com', resource: 'Auth System', ip: '192.168.1.1', status: 'Success', timestamp: '2023-10-25 14:30:22' },
  { id: '102', action: 'Failed Login Attempt', user: 'unknown', resource: 'Auth System', ip: '45.22.11.9', status: 'Failed', timestamp: '2023-10-25 14:28:15' },
  { id: '103', action: 'Created Load', user: 'dispatcher@system.com', resource: 'Load #5029', ip: '192.168.1.5', status: 'Success', timestamp: '2023-10-25 13:15:00' },
  { id: '104', action: 'Updated Settings', user: 'admin@system.com', resource: 'System Config', ip: '192.168.1.1', status: 'Warning', timestamp: '2023-10-25 11:05:44' },
];

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setTimeout(() => {
        setLogs(mockLogs);
        setIsLoading(false);
      }, 1200);
    };
    fetchLogs();
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Success': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'Failed': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      case 'Warning': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-500" />
            Activity Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Audit trail of system events and user actions.</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors gap-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search logs by user, action, or IP..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500">
            <option>All Events</option>
            <option>Auth Events</option>
            <option>System Events</option>
            <option>Data Changes</option>
          </select>
          <button className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500">Fetching activity records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-24 text-center">
            <Terminal className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No logs found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Timestamp</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Action & Resource</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">User Details</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-200">{log.action}</div>
                      <div className="text-slate-500 dark:text-slate-400 mt-1 text-xs">{log.resource}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {log.user}
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-500 mt-1 text-xs">
                        <Globe className="w-3.5 h-3.5 opacity-70" />
                        {log.ip}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusStyle(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export { ActivityLogsPage };
