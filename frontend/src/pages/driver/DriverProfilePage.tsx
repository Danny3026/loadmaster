import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMyDriver } from '../../hooks/useDrivers';

const DriverProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { data: driver, isLoading, error } = useMyDriver();
  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  if (error || !driver) return <div className="p-8 text-center text-red-600">Driver profile unavailable.</div>;
  const name = `${driver.first_name} ${driver.last_name}`;
  const assignment = driver.assignment;
  return <div className="min-h-screen bg-gray-50 pb-24"><div className="bg-blue-600 text-white px-6 pt-10 pb-20 rounded-b-[40px] shadow-lg"><h1 className="text-2xl font-bold">Profile</h1><div className="flex items-center mt-8"><div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">{driver.first_name?.[0]}{driver.last_name?.[0]}</div><div className="ml-5"><h2 className="text-2xl font-bold">{name}</h2><p className="text-blue-100 mt-1">{driver.status || 'ACTIVE'}</p></div></div></div><main className="px-4 -mt-10 relative z-10 space-y-4"><section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Contact</h3><p className="text-sm text-gray-500">Email</p><p className="font-semibold text-gray-900 mb-3">{driver.email || user?.email || '—'}</p><p className="text-sm text-gray-500">Phone</p><p className="font-semibold text-gray-900">{driver.phone || '—'}</p></section><section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">License</h3><p className="text-sm text-gray-500">License number</p><p className="font-semibold text-gray-900">{driver.license_number || '—'}</p></section><section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100"><h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Equipment</h3><p className="text-sm text-gray-500">Assigned truck</p><p className="font-semibold text-gray-900">{assignment?.unit_number ? `Unit ${assignment.unit_number} ${assignment.make || ''} ${assignment.model || ''}` : 'Unassigned'}</p></section></main></div>;
};

export default DriverProfilePage;
export { DriverProfilePage };
