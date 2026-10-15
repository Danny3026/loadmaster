import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, parseISO } from 'date-fns';
import { 
  Package, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Truck, 
  Send, 
  CheckCircle2, 
  Route, 
  MapPin, 
  Signpost,
  UserCircle2,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { dashboardApi } from '@/api/dashboard';
import { driversApi } from '@/api/drivers';
import { Spinner } from '@/components/ui/Spinner';

const StatCard = ({ title, mainValue, subValue, Icon, iconColorClass = "text-slate-400", isLoading, onClick }: any) => (
  <div onClick={onClick} className={`bg-white rounded-xl border border-slate-200 p-5 flex justify-between shadow-sm ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all' : ''}`}>
    <div>
      <h3 className="text-sm font-medium text-slate-500 mb-2">{title}</h3>
      {isLoading ? (
        <div className="h-8 w-16 bg-slate-100 animate-pulse rounded mt-1"></div>
      ) : (
        <div className="text-2xl font-bold text-slate-900 leading-none">{mainValue}</div>
      )}
      {subValue && !isLoading && <div className="text-sm text-slate-400 mt-2">{subValue}</div>}
    </div>
    <div className={iconColorClass}>
      <Icon className="h-5 w-5" strokeWidth={2} />
    </div>
  </div>
);

const ChartCard = ({ title, children, isLoading }: any) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
    <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
    <div className="flex-1 w-full min-h-[250px] relative">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </div>
      ) : children}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label, formatter, prefix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-lg text-sm z-50">
        <p className="font-medium text-slate-700 mb-1">{label}</p>
        <p className="text-slate-600">
          {formatter ? formatter(payload[0].value) : `${prefix}${payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch Drivers for Dropdown
  const { data: driversResponse, isLoading: isLoadingDrivers } = useQuery({
    queryKey: ['drivers', { limit: 100, offset: 0 }],
    queryFn: () => driversApi.getDrivers({ limit: 100, offset: 0 })
  });
  const drivers = driversResponse?.data || [];

  // Fetch Dashboard Stats
  const { data: statsResponse, isLoading, isFetching } = useQuery({
    queryKey: ['dashboardStats', driverId, startDate, endDate],
    queryFn: () => dashboardApi.getDashboardStats({ 
      driverId: driverId || undefined, 
      startDate: startDate || undefined, 
      endDate: endDate || undefined 
    })
  });

  const stats = statsResponse?.data || {
    activeLoads: 0,
    activeDrivers: 0,
    revenue: 0,
    driverPay: 0,
    avgRatePerMile: 0,
    dispatched: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
    deadheadMiles: 0,
    loadedMiles: 0,
    totalMiles: 0,
    rateByEquipment: [],
    revenueByEquipment: [],
    driverPerformance: []
  };

  const handleDatePreset = (preset: '7days' | '30days' | 'thisMonth') => {
    const today = new Date();
    if (preset === '7days') {
      setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === '30days') {
      setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'thisMonth') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Your operational overview at a glance.</p>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
        {/* Driver Dropdown */}
        <div className="relative group">
          <select 
            className="appearance-none flex items-center gap-2 px-3 py-2 pl-9 pr-8 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
          >
            <option value="">All Drivers</option>
            {drivers.length === 0 && !isLoadingDrivers ? (
              <option value="" disabled>No drivers available</option>
            ) : drivers.map((d: any) => (
              <option key={d.id} value={d.id}>{d.first_name || d.firstName} {d.last_name || d.lastName}</option>
            ))}
          </select>
          <UserCircle2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        
        {/* Presets */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button onClick={() => handleDatePreset('7days')} className="px-3 py-1.5 text-sm font-medium rounded-md text-slate-600 hover:text-slate-900 transition-colors focus:bg-blue-600 focus:text-white">
            Last 7 days
          </button>
          <button onClick={() => handleDatePreset('30days')} className="px-3 py-1.5 text-sm font-medium rounded-md text-slate-600 hover:text-slate-900 transition-colors focus:bg-blue-600 focus:text-white">
            Last 30 days
          </button>
          <button onClick={() => handleDatePreset('thisMonth')} className="px-3 py-1.5 text-sm font-medium rounded-md text-slate-600 hover:text-slate-900 transition-colors focus:bg-blue-600 focus:text-white">
            This Month
          </button>
        </div>

        {/* Date Pickers */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <span className="text-slate-400">-</span>
          <div className="relative">
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Core Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard isLoading={isLoading || isFetching} title="Active Loads" mainValue={stats.activeLoads} Icon={Package} />
        <StatCard
          isLoading={isLoading || isFetching}
          title="Drivers"
          mainValue={driverId ? 1 : (stats.totalDrivers ?? drivers.length)}
          subValue={driverId ? 'Selected driver' : undefined}
          Icon={Users}
        />
        <StatCard isLoading={isLoading || isFetching} title="Company Revenue" mainValue={formatCurrency(stats.revenue)} Icon={DollarSign} />
        <StatCard isLoading={isLoading || isFetching} title="Driver Pay" mainValue={formatCurrency(stats.driverPay)} subValue="Paid settlements" Icon={DollarSign} />
        <StatCard isLoading={isLoading || isFetching} title="Avg Rate/Mile" mainValue={formatCurrency(stats.avgRatePerMile)} Icon={TrendingUp} />
      </div>

      {/* ── Status Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        <StatCard isLoading={isLoading || isFetching} title="Pending" mainValue={stats.pending} Icon={Package} iconColorClass="text-amber-500" onClick={() => navigate('/loads?status=pending')} />
        <StatCard isLoading={isLoading || isFetching} title="Dispatched" mainValue={stats.dispatched} Icon={Truck} iconColorClass="text-indigo-500" onClick={() => navigate('/loads?status=dispatched')} />
        <StatCard isLoading={isLoading || isFetching} title="In Transit" mainValue={stats.inTransit} Icon={Send} iconColorClass="text-blue-500" onClick={() => navigate('/loads?status=in_transit')} />
        <StatCard isLoading={isLoading || isFetching} title="Delivered" mainValue={stats.delivered} Icon={CheckCircle2} iconColorClass="text-emerald-500" onClick={() => navigate('/loads?status=delivered')} />
      </div>

      {/* ── Mileage Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard isLoading={isLoading} title="Deadhead Miles" mainValue={stats.deadheadMiles.toLocaleString()} Icon={Route} iconColorClass="text-orange-500" />
        <StatCard isLoading={isLoading} title="Loaded Miles" mainValue={stats.loadedMiles.toLocaleString()} Icon={MapPin} iconColorClass="text-teal-500" />
        <StatCard isLoading={isLoading} title="Total Miles" mainValue={stats.totalMiles.toLocaleString()} Icon={Signpost} iconColorClass="text-indigo-500" />
      </div>

      {/* ── Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        <ChartCard isLoading={isLoading} title="Revenue Distribution">
          {stats.revenueByEquipment.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">No revenue data for this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByEquipment} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} stroke="#cbd5e1" />
                <RechartsTooltip content={<CustomTooltip formatter={(val: number) => `Revenue : $${val.toLocaleString()}`} />} />
                <Bar dataKey="revenue" fill="#3b82f6" maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        
        <ChartCard isLoading={isLoading} title="Average Rate Per Mile by Load Type">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.rateByEquipment} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={true} 
                tickLine={true} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                stroke="#cbd5e1"
              />
              <YAxis 
                axisLine={true} 
                tickLine={true} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(val) => `$${val.toFixed(2)}`}
                stroke="#cbd5e1"
              />
              <RechartsTooltip content={<CustomTooltip formatter={(val: number) => `Avg $/Mile : $${val.toFixed(2)}`} />} cursor={{fill: '#f1f5f9'}} />
              <Bar dataKey="value" fill="#cbd5e1" radius={[0, 0, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard isLoading={isLoading} title="Revenue by Load Type">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.revenueByEquipment} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={true} 
                tickLine={true} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                stroke="#cbd5e1"
              />
              <YAxis 
                axisLine={true} 
                tickLine={true} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                stroke="#cbd5e1"
              />
              <RechartsTooltip content={<CustomTooltip formatter={(val: number) => `Revenue : $${val.toLocaleString()}`} />} cursor={{fill: '#f1f5f9'}} />
              <Bar dataKey="revenue" fill="#cbd5e1" radius={[0, 0, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Driver Performance Section ── */}
      <div className="pt-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Driver Performance</h2>

        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            Company Revenue and Driver Pay by Driver
          </div>
          {stats.driverPerformance.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">No driver revenue data for this period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Driver</th>
                    <th className="px-4 py-3 font-semibold">Loads</th>
                    <th className="px-4 py-3 font-semibold">Company Revenue</th>
                    <th className="px-4 py-3 font-semibold">Driver Pay</th>
                    <th className="px-4 py-3 font-semibold">Avg $/Mile</th>
                    <th className="px-4 py-3 font-semibold">Total Miles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.driverPerformance.map((driver: any) => (
                    <tr key={driver.name} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{driver.name}</td>
                      <td className="px-4 py-3 text-slate-600">{driver.loads}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">${Number(driver.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">${Number(driver.driverPay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-slate-600">${Number(driver.avgRate || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-600">{Number(driver.totalMiles || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard isLoading={isLoading} title="Revenue by Driver">
            {stats.driverPerformance.length === 0 ? (
              <div className="flex items-center justify-center h-full w-full text-slate-400 text-sm">
                No driver data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.driverPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={true} tickLine={true} tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" />
                  <YAxis axisLine={true} tickLine={true} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} stroke="#cbd5e1" />
                  <RechartsTooltip content={<CustomTooltip formatter={(val: number) => `Revenue : $${val.toLocaleString()}`} />} cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          
          <ChartCard isLoading={isLoading} title="Loads by Driver">
            {stats.driverPerformance.length === 0 ? (
              <div className="flex items-center justify-center h-full w-full text-slate-400 text-sm">
                No driver data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.driverPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={true} tickLine={true} tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" />
                  <YAxis axisLine={true} tickLine={true} tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" />
                  <RechartsTooltip content={<CustomTooltip formatter={(val: number) => `Loads : ${val}`} />} cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="loads" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          
          <ChartCard isLoading={isLoading} title="Driver Efficiency — Avg Rate Per Mile">
            {stats.driverPerformance.length === 0 ? (
              <div className="flex items-center justify-center h-full w-full text-slate-400 text-sm">
                No driver data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.driverPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={true} tickLine={true} tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" />
                  <YAxis axisLine={true} tickLine={true} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `$${val.toFixed(2)}`} stroke="#cbd5e1" />
                  <RechartsTooltip content={<CustomTooltip formatter={(val: number) => `Avg $/Mile : $${val.toFixed(2)}`} />} cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="avgRate" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          
          <ChartCard isLoading={isLoading} title="Total Miles by Driver">
            {stats.driverPerformance.length === 0 ? (
              <div className="flex items-center justify-center h-full w-full text-slate-400 text-sm">
                No driver data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.driverPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={true} tickLine={true} tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" />
                  <YAxis axisLine={true} tickLine={true} tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" />
                  <RechartsTooltip content={<CustomTooltip formatter={(val: number) => `Total Miles : ${val.toLocaleString()}`} />} cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="totalMiles" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
