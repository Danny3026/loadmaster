import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateLoad } from '../../hooks/useLoads';
import { useToast } from '../../contexts/ToastContext';
import { FileText, Upload, X, Plus, Trash2 } from 'lucide-react';
import { LOAD_TYPE_OPTIONS, normalizeLoadType } from '../../constants/loadTypes';
import apiClient from '../../api/client';

// ── Types ──────────────────────────────────────────────────────────────────────
interface StopData {
  id: string;
  facilityName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  date: string;
  time: string;
  endTime: string;
  contact: string;
  phone: string;
}

const createEmptyStop = (): StopData => ({
  id: crypto.randomUUID(),
  facilityName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  date: '',
  time: '',
  endTime: '',
  contact: '',
  phone: '',
});

// ── Shared input class ─────────────────────────────────────────────────────────
const inputCls =
  'w-full border border-slate-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 dark:bg-slate-800 dark:text-slate-100 transition-colors';

const selectCls =
  'w-full border border-slate-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 bg-white dark:bg-slate-800 dark:text-slate-100 transition-colors';

const labelCls =
  'block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5';

// ── Time options for dropdown ──────────────────────────────────────────────────
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    const hour = h.toString().padStart(2, '0');
    TIME_OPTIONS.push(`${hour}:${m}`);
  }
}

const formatTime12 = (t: string) => {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
};

const splitTimeWindow = (value?: string) => {
  if (!value) return { start: '', end: '' };
  const parts = value.split(/\s*[-–]\s*/);
  const to24Hour = (time: string) => {
    const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return '';
    let hour = Number(match[1]);
    if (match[3]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (match[3]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${match[2]}`;
  };
  return { start: to24Hour(parts[0]), end: to24Hour(parts[1] || '') };
};

const cleanExtractedText = (value?: string | null) => {
  const cleaned = value?.trim();
  return cleaned && !/^(?:null|undefined|n\/a)$/i.test(cleaned) ? cleaned : '';
};

const cleanBrokerMc = (value?: string | null) => {
  const cleaned = cleanExtractedText(value);
  return /^0+$/.test(cleaned) ? '' : cleaned;
};

// ══════════════════════════════════════════════════════════════════════════════
// StopCard Component
// ══════════════════════════════════════════════════════════════════════════════
interface StopCardProps {
  stop: StopData;
  index: number;
  canDelete: boolean;
  onChange: (id: string, field: keyof StopData, value: string) => void;
  onDelete: (id: string) => void;
}

const StopCard: React.FC<StopCardProps> = ({ stop, index, canDelete, onChange, onDelete }) => (
  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4 bg-white dark:bg-slate-800/50">
    {/* Stop header */}
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
        Stop {index + 1}
      </span>
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(stop.id)}
          className="text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Remove stop"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>

    {/* Address */}
    <div>
      <label className={labelCls}>Address</label>
      <input
        type="text"
        value={stop.address}
        onChange={(e) => onChange(stop.id, 'address', e.target.value)}
        placeholder="Street address"
        className={inputCls}
      />
    </div>

    {/* City / State / Date / Time */}
    <div className="grid grid-cols-5 gap-3">
      <div>
        <label className={labelCls}>City</label>
        <input
          type="text"
          value={stop.city}
          onChange={(e) => onChange(stop.id, 'city', e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>State</label>
        <input
          type="text"
          value={stop.state}
          onChange={(e) => onChange(stop.id, 'state', e.target.value)}
          maxLength={2}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Zip</label>
        <input
          type="text"
          value={stop.zip}
          onChange={(e) => onChange(stop.id, 'zip', e.target.value)}
          maxLength={10}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Date</label>
        <input
          type="date"
          value={stop.date}
          onChange={(e) => onChange(stop.id, 'date', e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Time</label>
        <input
          type="time"
          value={stop.time}
          onChange={(e) => onChange(stop.id, 'time', e.target.value)}
          className={inputCls}
        />
      </div>
    </div>

    {/* End time (range) */}
    <div className="flex justify-end">
      <div className="w-1/4">
        <label className={labelCls}>End time (range)</label>
        <input
          type="time"
          value={stop.endTime}
          onChange={(e) => onChange(stop.id, 'endTime', e.target.value)}
          className={inputCls}
        />
      </div>
    </div>

    {/* Contact / Phone */}
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Contact</label>
        <input
          type="text"
          value={stop.contact}
          onChange={(e) => onChange(stop.id, 'contact', e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Phone</label>
        <input
          type="text"
          value={stop.phone}
          onChange={(e) => onChange(stop.id, 'phone', e.target.value)}
          placeholder="(555) 000-0000"
          className={inputCls}
        />
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// CreateLoadPage
// ══════════════════════════════════════════════════════════════════════════════
const CreateLoadPage: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: createLoad, isPending, error: submitError } = useCreateLoad();
  const { showError } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedFileName, setExtractedFileName] = useState('');
  const [extractionError, setExtractionError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ── Core form data ─────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    deadheadCity: '',
    deadheadState: '',
    deadheadMiles: '',
    loadNumber: '',
    loadType: '',
    equipmentTypeRaw: '',
    brokerName: '',
    brokerMC: '',
    rate: '',
    miles: '',
    weight: '',
    commodity: '',
    specialInstructions: '',
  });

  // ── Multi-stop state ───────────────────────────────────────────────────────
  const [pickupStops, setPickupStops] = useState<StopData[]>([createEmptyStop()]);
  const [deliveryStops, setDeliveryStops] = useState<StopData[]>([createEmptyStop()]);

  // ── Computed rate per mile ─────────────────────────────────────────────────
  const ratePerMile =
    formData.rate && formData.miles && parseFloat(formData.miles) > 0
      ? (parseFloat(formData.rate) / parseFloat(formData.miles)).toFixed(2)
      : '';

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCalculateMileage = () => {
    // Simple calculation: deadhead miles + loaded miles
    const deadhead = parseFloat(formData.deadheadMiles) || 0;
    const loaded = parseFloat(formData.miles) || 0;
    const total = deadhead + loaded;
    setFormData((prev) => ({
      ...prev,
      miles: total > 0 ? total.toString() : prev.miles,
    }));
  };

  const handleStopChange = useCallback(
    (type: 'pickup' | 'delivery', id: string, field: keyof StopData, value: string) => {
      const setter = type === 'pickup' ? setPickupStops : setDeliveryStops;
      setter((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const addStop = (type: 'pickup' | 'delivery') => {
    const setter = type === 'pickup' ? setPickupStops : setDeliveryStops;
    setter((prev) => [...prev, createEmptyStop()]);
  };

  const removeStop = (type: 'pickup' | 'delivery', id: string) => {
    const setter = type === 'pickup' ? setPickupStops : setDeliveryStops;
    setter((prev) => prev.filter((s) => s.id !== id));
  };

  // ── PDF Upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractedFileName(file.name);
    setExtractionError('');

    const body = new FormData();
    body.append('file', file);

    try {
      const response = await apiClient.post('/loads/extract-pdf', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const ext = response.data.data;

      // Fill core form
      setFormData((prev) => ({
        ...prev,
        loadNumber: ext.loadNumber || prev.loadNumber,
        brokerName: cleanExtractedText(ext.brokerName) || prev.brokerName,
        brokerMC: cleanBrokerMc(ext.brokerMC) || cleanBrokerMc(prev.brokerMC),
        commodity: ext.commodity || prev.commodity,
        loadType: normalizeLoadType(ext.equipmentType) || prev.loadType,
        equipmentTypeRaw: ext.equipmentTypeRaw || ext.equipmentType || prev.equipmentTypeRaw,
        rate: ext.rate?.toString() || prev.rate,
        weight: ext.weight?.toString() || prev.weight,
        miles: ext.miles?.toString() || prev.miles,
        specialInstructions: ext.specialInstructions || prev.specialInstructions,
      }));

      if (Array.isArray(ext.stops) && ext.stops.length > 0) {
        const toStopData = (stop: any): StopData => ({
          id: crypto.randomUUID(),
          facilityName: cleanExtractedText(stop.facilityName || stop.company),
          address: cleanExtractedText(stop.address),
          city: cleanExtractedText(stop.city),
          state: cleanExtractedText(stop.state),
          zip: cleanExtractedText(stop.zip),
          date: stop.date || '',
          time: stop.timeStart || splitTimeWindow(stop.time).start || '',
          endTime: stop.timeEnd || splitTimeWindow(stop.time).end || '',
          contact: cleanExtractedText(stop.contact),
          phone: cleanExtractedText(stop.phone),
        });
        const extractedPickups = ext.stops.filter((stop: any) => String(stop.type).toLowerCase() === 'pickup').map(toStopData);
        const extractedDeliveries = ext.stops.filter((stop: any) => String(stop.type).toLowerCase() === 'delivery').map(toStopData);
        if (extractedPickups.length > 0) setPickupStops(extractedPickups);
        if (extractedDeliveries.length > 0) setDeliveryStops(extractedDeliveries);
      }

      // Fill first pickup stop
      if (ext.pickup) {
        setPickupStops((prev) => {
          const updated = [...prev];
          updated[0] = {
            ...updated[0],
            facilityName: ext.pickup.facilityName || updated[0].facilityName,
            address: ext.pickup.address || updated[0].address,
            city: ext.pickup.city || updated[0].city,
            state: ext.pickup.state || updated[0].state,
            zip: ext.pickup.zip || updated[0].zip,
            date: ext.pickup.date || updated[0].date,
            time: ext.pickup.timeStart || splitTimeWindow(ext.pickup.time).start || updated[0].time,
            endTime: ext.pickup.timeEnd || splitTimeWindow(ext.pickup.time).end || updated[0].endTime,
            contact: cleanExtractedText(ext.pickup.contact) || updated[0].contact,
            phone: cleanExtractedText(ext.pickup.phone) || updated[0].phone,
          };
          return updated;
        });
      }

      // Fill first delivery stop
      if (ext.delivery) {
        setDeliveryStops((prev) => {
          const updated = [...prev];
          updated[0] = {
            ...updated[0],
            facilityName: ext.delivery.facilityName || updated[0].facilityName,
            address: ext.delivery.address || updated[0].address,
            city: ext.delivery.city || updated[0].city,
            state: ext.delivery.state || updated[0].state,
            zip: ext.delivery.zip || updated[0].zip,
            date: ext.delivery.date || updated[0].date,
            time: ext.delivery.timeStart || splitTimeWindow(ext.delivery.time).start || updated[0].time,
            endTime: ext.delivery.timeEnd || splitTimeWindow(ext.delivery.time).end || updated[0].endTime,
            contact: cleanExtractedText(ext.delivery.contact) || updated[0].contact,
            phone: cleanExtractedText(ext.delivery.phone) || updated[0].phone,
          };
          return updated;
        });
      }
    } catch (err: any) {
      setExtractionError(
        err?.response?.data?.error?.message ||
        err.message ||
        'Extraction could not complete. You can continue by reviewing or entering the load details manually.'
      );
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    // Validate required fields
    const errors: string[] = [];
    
    if (!formData.rate || parseFloat(formData.rate) < 0) {
      errors.push('Rate is required and must be >= 0');
    }

    if (!formData.brokerName.trim()) {
      errors.push('Broker name haikuonekana kwenye hati - tafadhali jaza broker halisi');
    }

    // Validate pickup stops
    pickupStops.forEach((s, i) => {
      if (!s.city?.trim()) errors.push(`Pickup ${i + 1}: City is required`);
      if (!s.state?.trim() || s.state.length !== 2) errors.push(`Pickup ${i + 1}: State must be 2 characters (e.g., TX)`);
    });

    // Validate delivery stops
    deliveryStops.forEach((s, i) => {
      if (!s.city?.trim()) errors.push(`Delivery ${i + 1}: City is required`);
      if (!s.state?.trim() || s.state.length !== 2) errors.push(`Delivery ${i + 1}: State must be 2 characters (e.g., TX)`);
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      showError(`Please fix ${errors.length} validation error(s)`);
      return;
    }

    const stops = [
      ...pickupStops.map((s, i) => ({
        stop_type: 'PICKUP' as const,
        stop_sequence: i + 1,
        facility_name: s.facilityName || s.address || s.city || `Pickup Stop ${i + 1}`,
        address_line1: s.address || undefined,
        city: s.city,
        state: s.state.toUpperCase(),
        zip_code: s.zip,
        appointment_date: s.date || undefined,
        appointment_start: s.time || undefined,
        appointment_end: s.endTime || undefined,
        contact_name: s.contact || undefined,
        contact_phone: s.phone || undefined,
      })),
      ...deliveryStops.map((s, i) => ({
        stop_type: 'DELIVERY' as const,
        stop_sequence: pickupStops.length + i + 1,
        facility_name: s.facilityName || s.address || s.city || `Delivery Stop ${i + 1}`,
        address_line1: s.address || undefined,
        city: s.city,
        state: s.state.toUpperCase(),
        zip_code: s.zip,
        appointment_date: s.date || undefined,
        appointment_start: s.time || undefined,
        appointment_end: s.endTime || undefined,
        contact_name: s.contact || undefined,
        contact_phone: s.phone || undefined,
      })),
    ];

    const payload = {
      load_number: formData.loadNumber || undefined,
      broker_name: formData.brokerName || undefined,
      broker_mc: formData.brokerMC || undefined,
      broker_mc_confirmed_missing: !formData.brokerMC.trim(),
      commodity: formData.commodity || undefined,
      rate: parseFloat(formData.rate) || 0,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      loaded_miles: formData.miles ? parseFloat(formData.miles) : null,
      deadhead_miles: parseFloat(formData.deadheadMiles) || 0,
      equipment_type: normalizeLoadType(formData.loadType),
      equipment_type_raw: formData.equipmentTypeRaw || undefined,
      special_instructions: formData.specialInstructions || undefined,
      stops,
    };

    console.debug('Create load payload', payload);

    createLoad(payload, { onSuccess: () => navigate('/loads') });
  };

  // Debug: expose last payload on submit for troubleshooting
  // (will log to console when submit attempted)

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-slate-900 py-6 px-4">
      <div className="max-w-[700px] mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden font-sans">

        {/* Header */}
        <div className="flex items-center justify-center p-5 border-b border-slate-100 dark:border-slate-700 relative">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Load</h2>
          <button
            onClick={() => navigate('/loads')}
            className="absolute right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8 text-sm">
          {/* Errors */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
              <div className="font-medium mb-2">Validation Errors:</div>
              <ul className="text-sm space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {submitError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
              <div className="font-medium">{(submitError as any)?.response?.data?.error?.message || 'Failed to create load'}</div>
              { (submitError as any)?.response?.data?.error?.details && (
                <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-40 bg-white/30 p-2 rounded">{JSON.stringify((submitError as any).response.data.error.details, null, 2)}</pre>
              ) }
            </div>
          )}
          {extractionError && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-800">
              {extractionError}
            </div>
          )}
          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isExtracting ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            {isExtracting ? (
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
            ) : extractedFileName && !extractionError ? (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <FileText className="text-emerald-500" size={32} strokeWidth={1.8} />
              </div>
            ) : (
              <Upload className="text-slate-500 mb-3" size={28} strokeWidth={1.5} />
            )}
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {isExtracting ? 'Extracting details...' : extractedFileName && !extractionError ? 'Data extracted!' : 'Upload Rate Confirmation PDF'}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-base mb-4">
              {extractedFileName && !extractionError ? 'Load details extracted from the document.' : 'AI will auto-fill load details from the document'}
            </p>
            {extractedFileName && !isExtracting && !extractionError && (
              <>
                <p className="text-base font-medium text-slate-800 dark:text-slate-200 mb-3">{extractedFileName}</p>
                <p className="text-base text-emerald-500 dark:text-emerald-400">✧ Data extracted</p>
              </>
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* ── STARTING POINT (DEADHEAD) ──────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider mb-3">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              STARTING POINT (DEADHEAD)
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>City</label>
                <input type="text" name="deadheadCity" value={formData.deadheadCity} onChange={handleChange} placeholder="e.g. Dallas" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input type="text" name="deadheadState" value={formData.deadheadState} onChange={handleChange} placeholder="TX" maxLength={2} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Deadhead Miles</label>
                <input type="text" name="deadheadMiles" value={formData.deadheadMiles} onChange={handleChange} placeholder="Miles to 1st pic" className={inputCls} />
              </div>
            </div>
          </section>

          {/* ── LOAD & BROKER INFO ─────────────────────────────────────────── */}
          <section>
            <div className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider mb-3">
              LOAD &amp; BROKER INFO
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Load # *</label>
                <input type="text" name="loadNumber" required value={formData.loadNumber} onChange={handleChange} placeholder="LD-001" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Load Type</label>
                <select name="loadType" value={formData.loadType} onChange={handleChange} className={selectCls}>
                  <option value="">Select...</option>
                  {LOAD_TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Broker Name</label>
                <input type="text" name="brokerName" value={formData.brokerName} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Broker MC#</label>
                <input type="text" name="brokerMC" value={formData.brokerMC} onChange={handleChange} placeholder="MC-123456 (optional)" className={inputCls} />
              </div>
            </div>
          </section>

          {/* ── RATE & SPECIFICATIONS ──────────────────────────────────────── */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <div className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                RATE &amp; SPECIFICATIONS
              </div>
              <button
                type="button"
                onClick={handleCalculateMileage}
                className="text-[12px] font-medium px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                Calculate Mileage
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
              <div>
                <label className={labelCls}>Rate ($) *</label>
                <input type="number" required name="rate" value={formData.rate} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Miles</label>
                <input type="number" name="miles" value={formData.miles} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>$/Mile</label>
                <input type="text" value={ratePerMile} readOnly className={`${inputCls} bg-slate-50 dark:bg-slate-700 cursor-not-allowed`} />
              </div>
              <div>
                <label className={labelCls}>Weight (lbs)</label>
                <input type="number" name="weight" value={formData.weight} onChange={handleChange} className={inputCls} />
              </div>
              <div className="col-span-2 sm:col-span-5">
                <label className={labelCls}>Commodity</label>
                <input type="text" name="commodity" value={formData.commodity} onChange={handleChange} className={inputCls} />
              </div>
            </div>
          </section>

          {/* ── PICKUP STOPS ───────────────────────────────────────────────── */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <div className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                PICKUP ({pickupStops.length} {pickupStops.length === 1 ? 'STOP' : 'STOPS'})
              </div>
              <button
                type="button"
                onClick={() => addStop('pickup')}
                className="text-slate-800 dark:text-slate-200 text-[13px] font-medium flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Plus size={14} /> Add Pickup
              </button>
            </div>
            <div className="space-y-4">
              {pickupStops.map((stop, i) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  index={i}
                  canDelete={pickupStops.length > 1}
                  onChange={(id, field, value) => handleStopChange('pickup', id, field, value)}
                  onDelete={(id) => removeStop('pickup', id)}
                />
              ))}
            </div>
          </section>

          {/* ── DELIVERY STOPS ─────────────────────────────────────────────── */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <div className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                DELIVERY ({deliveryStops.length} {deliveryStops.length === 1 ? 'STOP' : 'STOPS'})
              </div>
              <button
                type="button"
                onClick={() => addStop('delivery')}
                className="text-slate-800 dark:text-slate-200 text-[13px] font-medium flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Plus size={14} /> Add Delivery
              </button>
            </div>
            <div className="space-y-4">
              {deliveryStops.map((stop, i) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  index={i}
                  canDelete={deliveryStops.length > 1}
                  onChange={(id, field, value) => handleStopChange('delivery', id, field, value)}
                  onDelete={(id) => removeStop('delivery', id)}
                />
              ))}
            </div>
          </section>

          {/* ── SPECIAL INSTRUCTIONS ───────────────────────────────────────── */}
          <section>
            <label className={labelCls}>Special Instructions</label>
            <textarea
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleChange}
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </section>

          {/* ── Buttons ────────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => navigate('/loads')}
              className="px-6 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || isExtracting}
              className="px-6 py-2 bg-[#0052FF] text-white rounded-md font-medium hover:bg-[#0042CC] disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creating...' : 'Create Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLoadPage;