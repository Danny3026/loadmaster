import React, { useState, useEffect } from 'react';

// --- Icons (Inline SVGs) ---
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const TrendingUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>;

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportType, setReportType] = useState('revenue');
  const [dateRange, setDateRange] = useState('last_30_days');

  useEffect(() => {
    // Simulate loading dashboard data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would trigger a download or navigate to a detailed view
    alert(`Generating ${reportType} report for ${dateRange}...`);
    setIsModalOpen(false);
  };

  const statCards = [
    { title: 'Total Revenue', value: '$124,500', change: '+14.5%', positive: true, icon: <DollarSignIcon />, color: 'bg-green-500' },
    { title: 'Active Loads', value: '42', change: '+5.2%', positive: true, icon: <TrendingUpIcon />, color: 'bg-blue-500' },
    { title: 'Empty Miles', value: '12%', change: '-2.4%', positive: true, icon: <ChartBarIcon />, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Key metrics and comprehensive performance reports.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <DownloadIcon />
          Generate Report
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-teal-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statCards.map((stat, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
                <div className={`p-4 rounded-full text-white ${stat.color} bg-opacity-90`}>
                  {stat.icon}
                </div>
                <div className="ml-5">
                  <h3 className="text-sm font-medium text-gray-500">{stat.title}</h3>
                  <div className="flex items-baseline mt-1">
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    <span className={`ml-2 text-sm font-medium ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Area (Mocked with CSS layouts) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mock Chart 1 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Revenue Over Time</h3>
              <div className="h-64 flex items-end justify-between gap-2 border-b border-gray-200 pb-2">
                {[40, 70, 45, 90, 65, 100, 80].map((height, i) => (
                  <div key={i} className="w-full bg-teal-100 rounded-t-sm hover:bg-teal-200 transition-colors relative group">
                    <div 
                      className="absolute bottom-0 w-full bg-teal-500 rounded-t-sm transition-all duration-1000" 
                      style={{ height: `${height}%` }}
                    ></div>
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded">
                      ${height}k
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>

            {/* Mock Chart 2 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Loads by Status</h3>
              <div className="h-64 flex items-center justify-center">
                <div className="relative w-48 h-48 rounded-full border-[16px] border-gray-100">
                   {/* Simplified CSS "pie chart" look using conic-gradient if tailwind arbitary values allowed, else just a styled circle for mock */}
                   <div className="absolute inset-0 rounded-full border-[16px] border-blue-500" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 50%)' }}></div>
                   <div className="absolute inset-0 rounded-full border-[16px] border-green-500" style={{ clipPath: 'polygon(50% 50%, 0 50%, 0 0, 50% 0)' }}></div>
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                     <span className="text-3xl font-bold text-gray-800">42</span>
                     <span className="text-xs text-gray-500">Total Loads</span>
                   </div>
                </div>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center text-sm text-gray-600"><div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div> Delivered</div>
                <div className="flex items-center text-sm text-gray-600"><div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div> In Transit</div>
                <div className="flex items-center text-sm text-gray-600"><div className="w-3 h-3 bg-gray-200 rounded-full mr-2"></div> Pending</div>
              </div>
            </div>
          </div>

          {/* Recent Reports List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-200">
               <h3 className="text-lg font-medium text-gray-900">Recently Generated Reports</h3>
             </div>
             <ul className="divide-y divide-gray-200">
               {[
                 { name: 'Monthly Financial Summary - October', date: 'Oct 31, 2023', size: '1.2 MB' },
                 { name: 'Driver Performance Metrics Q3', date: 'Oct 15, 2023', size: '2.4 MB' },
                 { name: 'Fleet Maintenance Log', date: 'Oct 01, 2023', size: '0.8 MB' },
               ].map((doc, idx) => (
                 <li key={idx} className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                   <div className="flex items-center">
                     <div className="p-2 bg-gray-100 rounded text-gray-500"><FileIcon /></div>
                     <div className="ml-4">
                       <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                       <p className="text-sm text-gray-500">{doc.date} • {doc.size}</p>
                     </div>
                   </div>
                   <button className="text-teal-600 hover:text-teal-900 text-sm font-medium">Download</button>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl transform transition-all">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Generate Custom Report
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleGenerateReport} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                  <select 
                    value={reportType} 
                    onChange={e => setReportType(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 sm:text-sm bg-white"
                  >
                    <option value="revenue">Revenue & Financial</option>
                    <option value="driver_performance">Driver Performance</option>
                    <option value="fleet_status">Fleet Status & Maintenance</option>
                    <option value="broker_analysis">Broker Analysis</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <select 
                    value={dateRange} 
                    onChange={e => setDateRange(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 sm:text-sm bg-white"
                  >
                    <option value="last_7_days">Last 7 Days</option>
                    <option value="last_30_days">Last 30 Days</option>
                    <option value="this_quarter">This Quarter</option>
                    <option value="this_year">This Year</option>
                    <option value="custom">Custom Range...</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                  <div className="flex gap-4 mt-2">
                    <label className="inline-flex items-center">
                      <input type="radio" name="format" value="pdf" className="form-radio text-teal-600 focus:ring-teal-500 h-4 w-4" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">PDF Document</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" name="format" value="csv" className="form-radio text-teal-600 focus:ring-teal-500 h-4 w-4" />
                      <span className="ml-2 text-sm text-gray-700">CSV Export</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm">
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { ReportsPage };
