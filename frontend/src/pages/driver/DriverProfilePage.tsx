import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMyDriver } from '../../hooks/useDrivers';
import { AssignedTruckCard } from '../../components/driver/AssignedTruckCard';
import { DriverAvatar } from '../../components/driver/DriverAvatar';
import { DriverProfilePhoto } from '../../components/driver/DriverProfilePhoto';

const DriverProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { data: driver, isLoading, error } = useMyDriver();

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  if (error || !driver) return <div className="p-8 text-center text-red-600" role="alert">Driver profile unavailable.</div>;

  const name = [driver.first_name, driver.last_name].filter((part) => part?.trim()).join(' ') || 'Driver';
  const email = driver.email || user?.email || '—';

  return (
    <div className="min-h-screen space-y-4 bg-gray-50 pb-24">
      <header className="rounded-b-[40px] bg-blue-600 px-6 pb-20 pt-10 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Profile</h1>
        <div className="mt-8 flex items-center">
          <DriverAvatar driver={driver} className="h-20 w-20 bg-white text-2xl text-blue-700" />
          <div className="ml-5 min-w-0">
            <h2 className="truncate text-2xl font-bold">{name}</h2>
            <p className="mt-1 text-blue-100">{driver.status || 'ACTIVE'}</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 -mt-10 space-y-4 px-4">
        <DriverProfilePhoto driver={driver} />

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">Contact</h3>
          <p className="text-sm text-gray-500">Email</p>
          <p className="mb-3 break-words font-semibold text-gray-900">{email}</p>
          <p className="text-sm text-gray-500">Phone</p>
          <p className="font-semibold text-gray-900">{driver.phone || '—'}</p>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">License</h3>
          <p className="text-sm text-gray-500">License number</p>
          <p className="font-semibold text-gray-900">{driver.license_number || '—'}</p>
          {driver.license_state && <p className="mt-1 text-sm text-gray-600">State: {driver.license_state}</p>}
        </section>

        <AssignedTruckCard driver={driver} />
      </main>
    </div>
  );
};

export default DriverProfilePage;
export { DriverProfilePage };
