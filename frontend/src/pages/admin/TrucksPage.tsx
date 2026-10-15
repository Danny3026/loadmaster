import React, { useState, useEffect } from 'react';
import { trucksApi } from '../../api/trucks';

// --- Mock Data & Types ---
interface Truck {
  id: string;
  truckNumber: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  status: 'Available' | 'In Transit' | 'Maintenance';
}

const mockTrucks: Truck[] = [
  { id: '1', truckNumber: 'TRK-001', make: 'Freightliner', model: 'Cascadia', year: 2023, vin: '1FUJGFDF3N', status: 'Available' },
  { id: '2', truckNumber: 'TRK-002', make: 'Volvo', model: 'VNL 860', year: 2022, vin: '4V4NC9EJ2M', status: 'In Transit' },
  { id: '3', truckNumber: 'TRK-003', make: 'Peterbilt', model: '579', year: 2021, vin: '1XP5D49X5P', status: 'Maintenance' },
];

// --- Icons (Inline SVGs) ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Truck>>({});

  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const response = await trucksApi.getTrucks({ limit: 100, offset: 0 });
      const data = response?.data ?? response;
      setTrucks((Array.isArray(data) ? data : []).map((truck: any) => ({
        id: truck.id,
        truckNumber: truck.unit_number,
        make: truck.make,
        model: truck.model,
        year: truck.year,
        vin: truck.vin || '',
        status: truck.status === 'ACTIVE' ? 'Available' : truck.status === 'MAINTENANCE' ? 'Maintenance' : 'In Transit',
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchTrucks(); }, []);

  const handleOpenModal = (truck?: Truck) => {
    if (truck) {
      setEditingTruck(truck);
      setFormData(truck);
    } else {
      setEditingTruck(null);
      setFormData({ status: 'Available', year: new Date().getFullYear() });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTruck(null);
    setFormData({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      unit_number: formData.truckNumber,
      make: formData.make,
      model: formData.model,
      year: formData.year,
      vin: formData.vin,
      type: 'DRY_VAN',
      status: formData.status === 'Available' ? 'ACTIVE' : formData.status === 'Maintenance' ? 'MAINTENANCE' : 'INACTIVE',
    };
    if (editingTruck) await trucksApi.updateTruck(editingTruck.id, payload);
    else await trucksApi.createTruck(payload);
    handleCloseModal();
    await fetchTrucks();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this truck?')) {
      await trucksApi.deleteTruck(id);
      await fetchTrucks();
    }
  };

  const filteredTrucks = trucks.filter(t => 
    t.truckNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.make.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'In Transit': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Maintenance': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Trucks</h1>
          <p className="text-gray-500 mt-1">Manage your fleet vehicles and their current status.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <PlusIcon />
          Add Truck
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-white sm:flex sm:items-center sm:justify-between">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search trucks by number, VIN, or make..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-indigo-600"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading fleet data...</p>
          </div>
        ) : filteredTrucks.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="bg-gray-50 p-4 rounded-full mb-4">
              <TruckIcon />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No trucks found</h3>
            <p className="mt-1 text-gray-500 max-w-sm">
              {searchQuery ? "We couldn't find any trucks matching your search criteria." : "Start building your fleet by adding your first truck."}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => handleOpenModal()}
                className="mt-6 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                + Add New Truck
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Truck Details</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle Info</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">VIN</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrucks.map((truck) => (
                  <tr key={truck.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{truck.truckNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{truck.year} {truck.make}</div>
                      <div className="text-sm text-gray-500">{truck.model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 font-mono tracking-wider">{truck.vin}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(truck.status)}`}>
                        {truck.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => handleOpenModal(truck)} className="text-gray-400 hover:text-indigo-600 transition-colors" title="Edit">
                          <EditIcon />
                        </button>
                        <button onClick={() => handleDelete(truck.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl transform transition-all">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTruck ? 'Edit Truck Details' : 'Register New Truck'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Truck Number / ID</label>
                    <input required type="text" value={formData.truckNumber || ''} onChange={e => setFormData({...formData, truckNumber: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-bold" placeholder="TRK-001" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select required value={formData.status || 'Available'} onChange={e => setFormData({...formData, status: e.target.value as Truck['status']})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white">
                      <option value="Available">Available</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <input required type="text" value={formData.make || ''} onChange={e => setFormData({...formData, make: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Volvo" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input required type="text" value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="VNL 860" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input required type="number" min="1990" max={new Date().getFullYear() + 1} value={formData.year || ''} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="2023" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIN (Vehicle Identification Number)</label>
                  <input required type="text" value={formData.vin || ''} onChange={e => setFormData({...formData, vin: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono uppercase" placeholder="1FUJGFDF3N..." />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm">
                  {editingTruck ? 'Save Changes' : 'Register Truck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { TrucksPage };
