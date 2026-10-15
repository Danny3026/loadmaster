import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLoad, useUpdateLoad, useUpdateLoadStatus } from '../../hooks/useLoads';
import { useDrivers } from '../../hooks/useDrivers';
import { loadsApi } from '../../api/loads';
import { X, Plus, Trash2, MapPin, Upload } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { LOAD_TYPE_OPTIONS } from '../../constants/loadTypes';

// ── Types ──────────────────────────────────────────────────────────────────────
interface StopData {
  id?: string;
  stop_id?: string; // from backend
  address: string;
  city: string;
  state: string;
  zip: string;
  date: string;
  time: string;
  endTime: string;
  contact: string;
  phone: string;
  facility_name: string;
}

const createEmptyStop = (type: 'Pickup' | 'Delivery', index: number): StopData => ({
  address: '',
  city: '',
  state: '',
  zip: '',
  date: '',
  time: '',
  endTime: '',
  contact: '',
  phone: '',
  facility_name: `${type} Stop ${index + 1}`
});

const formatStoredDate = (value?: string | null) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

// ── Shared UI Classes ──────────────────────────────────────────────────────────
const inputCls =
  'w-full border border-slate-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 dark:bg-slate-800 dark:text-slate-100 transition-colors';

const selectCls =
  'w-full border border-slate-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 bg-white dark:bg-slate-800 dark:text-slate-100 transition-colors';

const labelCls =
  'block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5';

const sectionHeaderCls =
  'text-slate-500 dark:text-slate-400 font-bold text-[12px] uppercase tracking-wider mb-4 flex items-center gap-2';

const sectionBoxCls =
  'bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5';

// ══════════════════════════════════════════════════════════════════════════════
// StopCard Component
// ══════════════════════════════════════════════════════════════════════════════
interface StopCardProps {
  stop: StopData;
  index: number;
  canDelete: boolean;
  onChange: (index: number, field: keyof StopData, value: string) => void;
  onDelete: (index: number) => void;
}

const StopCard: React.FC<StopCardProps> = ({ stop, index, canDelete, onChange, onDelete }) => (
  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/30">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
        Stop {index + 1}
      </span>
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(index)}
          className="text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Remove stop"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>

    <div>
      <label className={labelCls}>Address</label>
      <input
        type="text"
        value={stop.address}
        onChange={(e) => onChange(index, 'address', e.target.value)}
        className={inputCls}
      />
    </div>

    <div className="grid grid-cols-5 gap-3">
      <div>
        <label className={labelCls}>City</label>
        <input type="text" value={stop.city} onChange={(e) => onChange(index, 'city', e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>State</label>
        <input type="text" value={stop.state} onChange={(e) => onChange(index, 'state', e.target.value)} maxLength={2} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Zip</label>
        <input type="text" value={stop.zip} onChange={(e) => onChange(index, 'zip', e.target.value)} maxLength={10} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Date</label>
        <input type="date" value={stop.date} onChange={(e) => onChange(index, 'date', e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Time</label>
        <input type="time" value={stop.time} onChange={(e) => onChange(index, 'time', e.target.value)} className={inputCls} />
      </div>
    </div>

    <div className="flex justify-end">
      <div className="w-1/4">
        <label className={labelCls}>End time (range)</label>
        <input type="time" value={stop.endTime} onChange={(e) => onChange(index, 'endTime', e.target.value)} className={inputCls} />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Contact</label>
        <input type="text" value={stop.contact} onChange={(e) => onChange(index, 'contact', e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Phone</label>
        <input type="text" value={stop.phone} onChange={(e) => onChange(index, 'phone', e.target.value)} className={inputCls} />
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// LoadDetailPage
// ══════════════════════════════════════════════════════════════════════════════
const LoadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const { data: loadData, isLoading, error } = useLoad(id!);
  const load = loadData as any;
  const { mutate: updateLoad, isPending: isUpdating } = useUpdateLoad();
  const { mutate: updateLoadStatus } = useUpdateLoadStatus();
  
  // Drivers for dropdown
  const { data: driversResponse } = useDrivers({ limit: 100 });
  const drivers = driversResponse?.data || [];

  // Form State
  const [formData, setFormData] = useState({
    status: 'pending',
    loadType: '',
    driverId: '',
    dispatcherId: '',
    deadheadCity: '',
    deadheadState: '',
    deadheadMiles: '',
    loadNumber: '',
    brokerName: '',
    brokerMC: '',
    rate: '',
    loadedMiles: '',
    totalMiles: '',
    weight: '',
    commodity: '',
    specialInstructions: '',
  });

  const [pickupStops, setPickupStops] = useState<StopData[]>([]);
  const [deliveryStops, setDeliveryStops] = useState<StopData[]>([]);
  const [originalStatus, setOriginalStatus] = useState('pending');
  const [documents, setDocuments] = useState<any[]>([]);

  // Computed
  const ratePerMile = formData.rate && formData.totalMiles && parseFloat(formData.totalMiles) > 0
    ? (parseFloat(formData.rate) / parseFloat(formData.totalMiles)).toFixed(2)
    : '';

  // Initialize state from loaded data
  useEffect(() => {
    if (load) {
      setFormData({
        status: load.status || 'pending',
        loadType: load.equipment_type || load.equipmentType || '',
        driverId: load.driver_id || load.driver?.id || '',
        dispatcherId: load.dispatcher_id || '',
        deadheadCity: load.deadhead_city || '',
        deadheadState: load.deadhead_state || '',
        deadheadMiles: load.dh_miles?.toString() || '0',
        loadNumber: load.load_number || load.loadNumber || '',
        brokerName: load.broker?.name || load.broker_name || '',
        brokerMC: load.broker?.mc_number || load.broker_mc || '',
        rate: load.rate?.toString() || '',
        loadedMiles: load.loaded_miles?.toString() || '0',
        totalMiles: load.total_miles?.toString() || '0',
        weight: load.weight?.toString() || '',
        commodity: load.commodity || '',
        specialInstructions: load.special_instructions || load.specialInstructions || '',
      });
      setOriginalStatus(load.status || 'pending');

      // Parse stops
      const loadedPickups: StopData[] = [];
      const loadedDeliveries: StopData[] = [];

      if (load.stops && Array.isArray(load.stops)) {
        load.stops.forEach((s: any) => {
          const stopData: StopData = {
            stop_id: s.id,
            address: s.address_line1 || s.addressLine1 || '',
            city: s.city || '',
            state: s.state || '',
            zip: s.zip_code || s.zip || '',
            date: formatStoredDate(s.appointment_date || s.appointmentDate),
            time: s.appointment_start || s.appointmentStart || '',
            endTime: s.appointment_end || s.appointmentEnd || '',
            contact: s.contact_name || s.contactName || '',
            phone: s.contact_phone || s.contactPhone || '',
            facility_name: s.facility_name || s.facilityName || '',
          };
          if (s.stop_type === 'PICKUP' || s.stopType === 'PICKUP') {
            loadedPickups.push(stopData);
          } else {
            loadedDeliveries.push(stopData);
          }
        });
      }

      setPickupStops(loadedPickups.length > 0 ? loadedPickups : [createEmptyStop('Pickup', 0)]);
      setDeliveryStops(loadedDeliveries.length > 0 ? loadedDeliveries : [createEmptyStop('Delivery', 0)]);
    }
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const fetchDocuments = async () => {
      const response = await fetch(`/api/loads/${id}/documents`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('loadmaster_token')}` },
      });
      if (response.ok) {
        const payload = await response.json();
        setDocuments(payload.data || []);
      }
    };
    void fetchDocuments();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCalculateMileage = () => {
    // Mock calculate: loaded miles + deadhead miles
    const loaded = parseFloat(formData.loadedMiles) || 0;
    const dh = parseFloat(formData.deadheadMiles) || 0;
    setFormData(prev => ({
      ...prev,
      totalMiles: (loaded + dh).toString()
    }));
    showSuccess("Mileage calculated successfully");
  };

  const handleStopChange = useCallback(
    (type: 'pickup' | 'delivery', index: number, field: keyof StopData, value: string) => {
      const setter = type === 'pickup' ? setPickupStops : setDeliveryStops;
      setter((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  const addStop = (type: 'pickup' | 'delivery') => {
    const setter = type === 'pickup' ? setPickupStops : setDeliveryStops;
    setter((prev) => [...prev, createEmptyStop(type === 'pickup' ? 'Pickup' : 'Delivery', prev.length)]);
  };

  const removeStop = (type: 'pickup' | 'delivery', index: number) => {
    const setter = type === 'pickup' ? setPickupStops : setDeliveryStops;
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleViewRoute = () => {
    const allStops = [...pickupStops, ...deliveryStops].filter(s => s.address || s.city);
    if (allStops.length < 2) {
      showError("Need at least 2 stops to view route");
      return;
    }
    const query = allStops.map(s => encodeURIComponent(`${s.address}, ${s.city}, ${s.state}`)).join('/');
    window.open(`https://www.google.com/maps/dir/${query}`, '_blank');
  };

  const handleArchive = async () => {
    if (!load?.id || !window.confirm('Archive this load?')) return;
    await loadsApi.archiveLoad(load.id);
    navigate('/archive');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !load?.id) return;
    
    showSuccess(`Uploading ${docType}...`);
    // Note: This relies on the backend route POST /api/loads/:id/documents
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('document_type', docType);
      
      const token = localStorage.getItem('loadmaster_token');
      const res = await fetch(`/api/loads/${load.id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataUpload
      });
      if (!res.ok) throw new Error("Upload failed");
      const uploaded = await res.json();
      if (uploaded.data) setDocuments((previous) => [...previous, uploaded.data]);
      showSuccess(`${docType} uploaded successfully!`);
    } catch (err) {
      showError(`Failed to upload ${docType}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const stops = [
      ...pickupStops.map((s, i) => ({
        id: s.stop_id,
        stop_type: 'PICKUP',
        stop_sequence: i + 1,
        facility_name: s.facility_name,
        address_line1: s.address || 'TBD',
        city: s.city || 'TBD',
        state: s.state || 'XX',
        zip_code: s.zip || '00000',
        appointment_date: s.date || undefined,
        appointment_start: s.time || undefined,
        appointment_end: s.endTime || undefined,
        contact_name: s.contact || undefined,
        contact_phone: s.phone || undefined,
      })),
      ...deliveryStops.map((s, i) => ({
        id: s.stop_id,
        stop_type: 'DELIVERY',
        stop_sequence: pickupStops.length + i + 1,
        facility_name: s.facility_name,
        address_line1: s.address || 'TBD',
        city: s.city || 'TBD',
        state: s.state || 'XX',
        zip_code: '00000',
        appointment_date: s.date || undefined,
        appointment_start: s.time || undefined,
        appointment_end: s.endTime || undefined,
        contact_name: s.contact || undefined,
        contact_phone: s.phone || undefined,
      })),
    ];

    const updatePayload = {
          equipment_type: formData.loadType || undefined,
          driver_id: formData.driverId || undefined,
          broker_name: formData.brokerName,
          broker_mc: formData.brokerMC,
          commodity: formData.commodity,
          rate: parseFloat(formData.rate) || 0,
          weight: parseFloat(formData.weight) || undefined,
          loaded_miles: parseFloat(formData.loadedMiles) || 0,
          dh_miles: parseFloat(formData.deadheadMiles) || 0,
          total_miles: parseFloat(formData.totalMiles) || 0,
          special_instructions: formData.specialInstructions,
          stops,
        };
    updateLoad(
      { id: load.id, data: updatePayload },
      {
        onSuccess: () => {
          if (formData.status !== originalStatus) {
            updateLoadStatus(
              { id: load.id, status: formData.status },
              { onSuccess: () => navigate('/loads') }
            );
            return;
          }
          navigate('/loads');
        },
        onError: (error: any) => {
          const details = error.response?.data?.error?.details;
          if (details?.type !== 'DRIVER_UNAVAILABLE') return;
          const periods = (details.periods || []).map((period: any) => `${period.start_date} to ${period.end_date}${period.reason ? ` (${period.reason})` : ''}`).join('\n');
          if (!window.confirm(`${details.driver_name} is unavailable during part of this load:\n${periods}\n\nAssign anyway?`)) return;
          updateLoad(
            { id: load.id, data: { ...updatePayload, override_availability_conflict: true } },
            { onSuccess: () => navigate('/loads') }
          );
        },
      }
    );
  };

  if (isLoading) return <div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;
  if (error || !load) return <div className="p-10 text-center text-red-500">Error loading data.</div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-slate-900 py-6 px-4">
      <div className="max-w-[700px] mx-auto bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden font-sans pb-10 shadow-sm border border-slate-200 dark:border-slate-700">
        
        {/* Header (Modal Style) */}
        <div className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] font-bold text-slate-900 dark:text-white">Load {formData.loadNumber}</h2>
            <span className="text-[13px] text-slate-500 font-medium">{load.invoice_number || ''}</span>
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              {formData.status.replace(/_/g, ' ')}
            </span>
          </div>
          <button onClick={() => navigate('/admin/loads')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          
          {/* ASSIGNMENT & STATUS */}
          <section className={sectionBoxCls}>
            <div className={sectionHeaderCls}>ASSIGNMENT &amp; STATUS</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className={selectCls}>
                  <option value="pending">Pending</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Load Type</label>
                <select name="loadType" value={formData.loadType} onChange={handleChange} className={selectCls}>
                  <option value="">Select...</option>
                  {LOAD_TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Assigned Driver</label>
                <select name="driverId" value={formData.driverId} onChange={handleChange} className={selectCls}>
                  <option value="">Unassigned</option>
                  {drivers.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Dispatcher</label>
                <select name="dispatcherId" value={formData.dispatcherId} onChange={handleChange} className={selectCls}>
                  <option value="">Unassigned</option>
                  <option value="user_1">System Admin</option>
                  <option value="user_2">Dispatcher 1</option>
                </select>
              </div>
            </div>
          </section>

          {/* STARTING POINT */}
          <section className={sectionBoxCls}>
            <div className={sectionHeaderCls}>
              <MapPin size={16} className="text-blue-500" /> STARTING POINT (DEADHEAD)
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>City</label>
                <input type="text" name="deadheadCity" value={formData.deadheadCity} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input type="text" name="deadheadState" value={formData.deadheadState} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Deadhead Miles</label>
                <input type="number" name="deadheadMiles" value={formData.deadheadMiles} onChange={handleChange} className={inputCls} />
              </div>
            </div>
          </section>

          {/* LOAD & BROKER INFO */}
          <section className={sectionBoxCls}>
            <div className={sectionHeaderCls}>LOAD &amp; BROKER INFO</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Load # *</label>
                <input type="text" name="loadNumber" required value={formData.loadNumber} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Broker Name</label>
                <input type="text" name="brokerName" value={formData.brokerName} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Broker MC#</label>
                <input type="text" name="brokerMC" value={formData.brokerMC} onChange={handleChange} className={inputCls} />
              </div>
            </div>
          </section>

          {/* RATE & SPECIFICATIONS */}
          <section className={sectionBoxCls}>
            <div className="flex justify-between items-center mb-4">
              <div className="text-slate-500 dark:text-slate-400 font-bold text-[12px] uppercase tracking-wider">
                RATE &amp; SPECIFICATIONS
              </div>
              <button 
                type="button" 
                onClick={handleCalculateMileage}
                className="bg-[#0052FF] text-white px-3 py-1.5 rounded-md text-[13px] font-medium flex items-center gap-1.5 hover:bg-[#0042CC] transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Calculate Mileage
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className={labelCls}>Rate ($)</label>
                <input type="number" name="rate" value={formData.rate} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>$/Mile (Total)</label>
                <input type="text" value={ratePerMile} readOnly className={`${inputCls} bg-slate-50 dark:bg-slate-700 font-medium`} />
              </div>
              <div>
                <label className={labelCls}>Weight (lbs)</label>
                <input type="number" name="weight" value={formData.weight} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Loaded Miles</label>
                <input type="number" name="loadedMiles" value={formData.loadedMiles} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Deadhead Miles</label>
                <input type="number" name="deadheadMiles" value={formData.deadheadMiles} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Total Miles</label>
                <input type="number" name="totalMiles" value={formData.totalMiles} onChange={handleChange} className={inputCls} />
              </div>
              <div className="col-span-3">
                <label className={labelCls}>Commodity</label>
                <input type="text" name="commodity" value={formData.commodity} onChange={handleChange} className={inputCls} />
              </div>
            </div>
          </section>

          {/* PICKUP STOPS */}
          <section className={sectionBoxCls}>
            <div className="flex justify-between items-center mb-4">
              <div className="text-slate-500 dark:text-slate-400 font-bold text-[12px] uppercase tracking-wider">
                PICKUP ({pickupStops.length} STOPS)
              </div>
              <button type="button" onClick={() => addStop('pickup')} className="text-slate-800 dark:text-slate-200 text-[13px] font-medium flex items-center gap-1 hover:text-blue-600 transition-colors">
                <Plus size={14} /> Add Pickup
              </button>
            </div>
            <div className="space-y-4">
              {pickupStops.map((stop, i) => (
                <StopCard key={i} stop={stop} index={i} canDelete={pickupStops.length > 1} onChange={(idx, f, v) => handleStopChange('pickup', idx, f, v)} onDelete={(idx) => removeStop('pickup', idx)} />
              ))}
            </div>
          </section>

          {/* DELIVERY STOPS */}
          <section className={sectionBoxCls}>
            <div className="flex justify-between items-center mb-4">
              <div className="text-slate-500 dark:text-slate-400 font-bold text-[12px] uppercase tracking-wider">
                DELIVERY ({deliveryStops.length} STOPS)
              </div>
              <button type="button" onClick={() => addStop('delivery')} className="text-slate-800 dark:text-slate-200 text-[13px] font-medium flex items-center gap-1 hover:text-blue-600 transition-colors">
                <Plus size={14} /> Add Delivery
              </button>
            </div>
            <div className="space-y-4">
              {deliveryStops.map((stop, i) => (
                <StopCard key={i} stop={stop} index={i} canDelete={deliveryStops.length > 1} onChange={(idx, f, v) => handleStopChange('delivery', idx, f, v)} onDelete={(idx) => removeStop('delivery', idx)} />
              ))}
            </div>
          </section>

          {/* VIEW ROUTE */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button type="button" onClick={handleViewRoute} className="w-full flex items-center justify-center gap-2 p-4 text-[14px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <MapPin size={18} /> View Route on Google Maps
            </button>
          </div>

          {/* SPECIAL INSTRUCTIONS */}
          <section className={sectionBoxCls}>
            <div className={sectionHeaderCls}>SPECIAL INSTRUCTIONS</div>
            <textarea
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleChange}
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </section>

          {/* DOCUMENTS & PODS */}
          <section className={sectionBoxCls}>
            <div className={sectionHeaderCls}><Upload size={16} className="text-blue-500"/> DOCUMENTS &amp; PODS</div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] text-slate-500 dark:text-slate-400 mb-2">Rate Confirmation</label>
                <div className="border border-slate-200 dark:border-slate-600 rounded-md p-4 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center relative hover:bg-slate-100 transition-colors">
                  <input type="file" onChange={(e) => handleFileUpload(e, 'RATE_CONFIRMATION')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium text-[14px]">
                    <Upload size={18} /> Upload Rate Confirmation
                  </div>
                  <div className="text-slate-400 text-[12px] mt-1">PDF files only</div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[13px] text-slate-500 dark:text-slate-400">Proof of Delivery ({documents.filter((document) => document.document_type === 'POD').length})</label>
                  <label className="text-[13px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer relative">
                    <Upload size={14} /> Upload POD
                    <input type="file" onChange={(e) => handleFileUpload(e, 'POD')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                </div>
                {documents.filter((document) => document.document_type === 'POD').length === 0 ? (
                  <div className="text-[13px] text-slate-400 italic">No POD images uploaded yet.</div>
                ) : (
                  documents.filter((document) => document.document_type === 'POD').map((document) => (
                    <a key={document.id} href={`/api/documents/${document.id}`} className="text-[13px] text-blue-600 hover:underline">
                      {document.original_filename}
                    </a>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 pb-2 sticky bottom-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 mt-6 -mx-4 px-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
            <button type="button" onClick={() => navigate('/loads')} className="px-6 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            {load?.status !== 'cancelled' && <button type="button" onClick={() => void handleArchive()} className="px-6 py-2 border border-red-200 bg-white text-red-700 rounded-md font-medium hover:bg-red-50 transition-colors">Archive Load</button>}
            <button type="submit" disabled={isUpdating} className="px-6 py-2 bg-[#0052FF] text-white rounded-md font-medium hover:bg-[#0042CC] disabled:opacity-50 transition-colors shadow-sm">
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default LoadDetailPage;