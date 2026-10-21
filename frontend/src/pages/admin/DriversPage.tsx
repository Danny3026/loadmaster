import React, { useState, useEffect, useCallback, useRef } from 'react';
import { driversApi } from '../../api/drivers';
import { trucksApi } from '../../api/trucks';
import { DriverTruckOption, DriverTruckSelector } from '../../components/drivers/DriverTruckSelector';
import { US_STATES } from '../../constants/usStates';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Upload } from 'lucide-react';

// --- Types ---
interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  license_number: string;
  license_state?: string;
  license_expiry?: string;
  cdl_class?: string | null;
  cdl_endorsements?: string | null;
  cdl_restrictions?: string | null;
  cdl_issue_date?: string | null;
  date_of_birth?: string | null;
  medical_card_expiry?: string | null;
  clearinghouse_renewal_date?: string | null;
  phone?: string;
  email?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'ASSIGNED';
  company_id?: string;
  created_at?: string;
  truck_id?: string;
  truck_unit_number?: string;
  trailer_number?: string;
  current_city?: string;
  current_state?: string;
  mailing_address?: string | null;
  mailing_city?: string | null;
  mailing_state?: string | null;
  mailing_zip?: string | null;
  tin?: string | null;
  default_compensation_type?: 'PER_MILE' | 'PERCENT_OF_RATE';
  default_compensation_rate?: number | string | null;
  compensation_rates?: CompensationRate[];
}

interface CompensationRate {
  load_type: string;
  pay_type: 'PER_MILE' | 'PERCENT_OF_RATE';
  rate: number | string | null;
}

interface AvailabilityPeriod {
  id: string;
  driver_id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

interface TimelineData {
  drivers: Array<{ id: string; first_name: string; last_name: string; status: string }>;
  unavailable: AvailabilityPeriod[];
  assignments: Array<{ driver_id: string; load_id: string; load_number: string; start_date: string | null; end_date: string | null }>;
}

const toDateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromDateOnly = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const shiftDateOnly = (value: string, amount: number) => {
  const date = fromDateOnly(value);
  date.setDate(date.getDate() + amount);
  return toDateOnly(date);
};
const formatDateOnly = (value: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) =>
  fromDateOnly(value).toLocaleDateString('en-US', options);

interface FormData {
  first_name: string;
  last_name: string;
  license_number: string;
  license_state: string;
  license_expiry: string;
  cdl_class: string;
  cdl_endorsements: string;
  cdl_restrictions: string;
  cdl_issue_date: string;
  date_of_birth: string;
  medical_card_expiry: string;
  clearinghouse_renewal_date: string;
  phone: string;
  email: string;
  notes: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  truck_id: string;
  trailer_number: string;
  current_city: string;
  current_state: string;
  mailing_address: string;
  mailing_city: string;
  mailing_state: string;
  mailing_zip: string;
  tin: string;
  default_compensation_type: 'PER_MILE' | 'PERCENT_OF_RATE';
  default_compensation_rate: string;
  compensation_rates: CompensationRate[];
}

const LOAD_TYPES = ['FLATBED', 'REEFER', 'DRY_VAN', 'POWER_ONLY', 'BOX_TRUCK', 'SPRINTER_VAN', 'HOT_SHOT'];

const defaultForm: FormData = {
  first_name: '',
  last_name: '',
  license_number: '',
  license_state: '',
  license_expiry: '',
  cdl_class: '',
  cdl_endorsements: '',
  cdl_restrictions: '',
  cdl_issue_date: '',
  date_of_birth: '',
  medical_card_expiry: '',
  clearinghouse_renewal_date: '',
  phone: '',
  email: '',
  notes: '',
  status: 'ACTIVE',
  truck_id: '',
  trailer_number: '',
  current_city: '',
  current_state: '',
  mailing_address: '',
  mailing_city: '',
  mailing_state: '',
  mailing_zip: '',
  tin: '',
  default_compensation_type: 'PER_MILE',
  default_compensation_rate: '',
  compensation_rates: LOAD_TYPES.map(load_type => ({ load_type, pay_type: 'PER_MILE', rate: null })),
};

// --- Icons ---
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// --- Status Config ---
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  ACTIVE: {
    label: 'Available',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  ASSIGNED: {
    label: 'On Duty',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  ON_LEAVE: {
    label: 'On Leave',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  INACTIVE: {
    label: 'Inactive',
    color: 'bg-red-50 text-red-600 border-red-200',
    dot: 'bg-red-500',
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['INACTIVE'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function getInitials(first: string, last: string) {
  return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// --- Main Component ---
export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<DriverTruckOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [trucksLoading, setTrucksLoading] = useState(true);
  const [trucksError, setTrucksError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [timelineStart, setTimelineStart] = useState(() => toDateOnly(new Date()));
  const [timelineData, setTimelineData] = useState<TimelineData>({ drivers: [], unavailable: [], assignments: [] });
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDriverLoading, setIsDriverLoading] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [focusedSection, setFocusedSection] = useState('personal-details');
  const [isCdlExtracting, setIsCdlExtracting] = useState(false);
  const [cdlUploadError, setCdlUploadError] = useState<string | null>(null);
  const cdlFileInputRef = useRef<HTMLInputElement>(null);
  const [availabilityPeriods, setAvailabilityPeriods] = useState<AvailabilityPeriod[]>([]);
  const [availabilityStart, setAvailabilityStart] = useState('');
  const [availabilityEnd, setAvailabilityEnd] = useState('');
  const [availabilityReason, setAvailabilityReason] = useState('');
  const [editingAvailabilityId, setEditingAvailabilityId] = useState('');
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [portalCredentials, setPortalCredentials] = useState<{ email: string; temporaryPassword?: string } | null>(null);
  const [tinInputActive, setTinInputActive] = useState(false);

  const maskTin = (value?: string | null) => {
    const clean = (value || '').replace(/\D/g, '');
    if (!clean) return '';
    return `${'•'.repeat(3)}-••-${clean.slice(-4)}`;
  };

  const getTinFieldValue = () => {
    if (!formData.tin) return '';
    return tinInputActive ? formData.tin : maskTin(formData.tin);
  };

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await driversApi.getDrivers({ limit: 100, offset: 0 });
      // Handle both paginated and direct array responses
      const data = res?.data ?? res;
      setDrivers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load drivers. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const fetchTrucks = useCallback(async () => {
    setTrucksLoading(true);
    setTrucksError('');
    try {
      const response = await trucksApi.getTrucks({ limit: 100, offset: 0 });
      if (!Array.isArray(response?.data)) {
        throw new Error('The company truck list response was invalid.');
      }
      setTrucks(response.data);
    } catch (err: any) {
      setTrucksError(err?.response?.data?.error?.message || err?.message || 'Unable to load company trucks.');
    } finally {
      setTrucksLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTrucks();
  }, [fetchTrucks]);

  const timelineEnd = shiftDateOnly(timelineStart, 13);
  const timelineDays = Array.from({ length: 14 }, (_, index) => shiftDateOnly(timelineStart, index));

  const refreshTimeline = async () => {
    setTimelineLoading(true);
    setTimelineError('');
    try {
      const response = await driversApi.getAvailabilityTimeline(timelineStart, timelineEnd);
      const result = response?.data ?? response;
      setTimelineData({
        drivers: result?.drivers || [],
        unavailable: result?.unavailable || [],
        assignments: result?.assignments || [],
      });
    } catch (err: any) {
      setTimelineError(err?.response?.data?.error?.message || 'Unable to load driver availability.');
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    void refreshTimeline();
  }, [timelineStart]);

  const refreshAvailabilityPeriods = async (driverId: string) => {
    const response = await driversApi.getAvailability(driverId);
    const periods = response?.data?.data ?? response?.data ?? [];
    setAvailabilityPeriods(Array.isArray(periods) ? periods : []);
  };

  useEffect(() => {
    if (!isModalOpen || isDriverLoading) return;
    document.getElementById(focusedSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusedSection, isDriverLoading, isModalOpen]);

  const handleOpenModal = async (driver?: Driver, section = 'personal-details') => {
    setFormError(null);
    setCdlUploadError(null);
    setAvailabilityError('');
    setEditingAvailabilityId('');
    setAvailabilityStart('');
    setAvailabilityEnd('');
    setAvailabilityReason('');
    setFocusedSection(section);
    if (driver) {
      setEditingDriver(driver);
      setIsDriverLoading(true);
      setFormData(driverToFormData(driver));
      setIsModalOpen(true);
      try {
        const response = await driversApi.getDriverById(driver.id);
        const fullDriver = response?.data?.data ?? response?.data ?? response;
        setEditingDriver(fullDriver);
        setFormData(driverToFormData(fullDriver));
        await refreshAvailabilityPeriods(fullDriver.id);
      } catch (err: any) {
        setFormError(err?.response?.data?.error?.message || 'Could not load all saved driver details. Showing available driver information.');
      } finally {
        setIsDriverLoading(false);
      }
    } else {
      setEditingDriver(null);
      setFormData(defaultForm);
      setAvailabilityPeriods([]);
      setIsDriverLoading(false);
      setIsModalOpen(true);
    }
  };

  const driverToFormData = (driver: Driver): FormData => ({
    ...defaultForm,
    ...driver,
    first_name: driver.first_name || '',
    last_name: driver.last_name || '',
    license_number: driver.license_number || '',
    license_state: driver.license_state || '',
    license_expiry: String(driver.license_expiry || '').slice(0, 10),
    cdl_class: driver.cdl_class || '',
    cdl_endorsements: driver.cdl_endorsements || '',
    cdl_restrictions: driver.cdl_restrictions || '',
    cdl_issue_date: String(driver.cdl_issue_date || '').slice(0, 10),
    date_of_birth: String(driver.date_of_birth || '').slice(0, 10),
    medical_card_expiry: String(driver.medical_card_expiry || '').slice(0, 10),
    clearinghouse_renewal_date: String(driver.clearinghouse_renewal_date || '').slice(0, 10),
    phone: driver.phone || '',
    email: driver.email || '',
    notes: driver.notes || '',
    status: (driver.status === 'ASSIGNED' ? 'ACTIVE' : driver.status) as FormData['status'],
    truck_id: driver.truck_id || '',
    trailer_number: driver.trailer_number || '',
    current_city: driver.current_city || '',
    current_state: driver.current_state || '',
    mailing_address: driver.mailing_address || '',
    mailing_city: driver.mailing_city || '',
    mailing_state: driver.mailing_state || '',
    mailing_zip: driver.mailing_zip || '',
    tin: driver.tin || '',
    default_compensation_type: driver.default_compensation_type || 'PER_MILE',
    default_compensation_rate: driver.default_compensation_rate?.toString() || '',
    compensation_rates: LOAD_TYPES.map((load_type) => driver.compensation_rates?.find((rate) => rate.load_type === load_type) || ({ load_type, pay_type: 'PER_MILE', rate: null })),
  });

  const handleCdlUpload = async (file?: File) => {
    if (!file || !editingDriver) return;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCdlUploadError('Choose a CDL photo (JPEG, PNG, or WebP) or PDF.');
      return;
    }
    setIsCdlExtracting(true);
    setCdlUploadError(null);
    try {
      const response = await driversApi.extractCdl(editingDriver.id, file);
      const fields = response?.data?.fields ?? response?.fields ?? {};
      const mapping: Record<string, keyof FormData> = {
        license_number: 'license_number',
        license_state: 'license_state',
        cdl_class: 'cdl_class',
        cdl_endorsements: 'cdl_endorsements',
        cdl_restrictions: 'cdl_restrictions',
        cdl_issue_date: 'cdl_issue_date',
        license_expiry: 'license_expiry',
        date_of_birth: 'date_of_birth',
      };
      const detectedEntries = Object.entries(mapping).filter(([source]) => typeof fields[source] === 'string' && fields[source].trim());
      setFormData((previous) => {
        const next = { ...previous };
        for (const [source, target] of detectedEntries) {
          next[target] = fields[source].trim() as never;
        }
        return next;
      });
      if (detectedEntries.length === 0) {
        setCdlUploadError('No reliable CDL details were detected. Existing values were kept unchanged.');
      }
    } catch (err: any) {
      setCdlUploadError(err?.response?.data?.error?.message || 'Could not extract CDL details. Existing values were kept unchanged.');
    } finally {
      setIsCdlExtracting(false);
    }
  };

  const getDayStatus = (driverId: string, date: string, driverStatus?: string) => {
    if (timelineData.unavailable.some((period) => period.driver_id === driverId && period.start_date <= date && period.end_date >= date)) return 'UNAVAILABLE';
    if (timelineData.assignments.some((assignment) => assignment.driver_id === driverId && assignment.start_date && assignment.end_date && assignment.start_date <= date && assignment.end_date >= date)) return 'ASSIGNED';
    if (date === toDateOnly(new Date()) && driverStatus === 'ASSIGNED') return 'ASSIGNED';
    if (driverStatus === 'INACTIVE') return 'INACTIVE';
    if (date === toDateOnly(new Date()) && driverStatus === 'ON_LEAVE') return 'UNAVAILABLE';
    return 'AVAILABLE';
  };

  const getCurrentAvailability = (driver: Driver) => getDayStatus(driver.id, toDateOnly(new Date()), driver.status);

  const openAvailabilityEdit = (period: AvailabilityPeriod) => {
    setEditingAvailabilityId(period.id);
    setAvailabilityStart(String(period.start_date).slice(0, 10));
    setAvailabilityEnd(String(period.end_date).slice(0, 10));
    setAvailabilityReason(period.reason || '');
    setAvailabilityError('');
  };

  const resetAvailabilityForm = () => {
    setEditingAvailabilityId('');
    setAvailabilityStart('');
    setAvailabilityEnd('');
    setAvailabilityReason('');
    setAvailabilityError('');
  };

  const handleSaveAvailability = async () => {
    if (!editingDriver) return;
    if (!availabilityStart || !availabilityEnd || availabilityEnd < availabilityStart) {
      setAvailabilityError('Enter a valid date range. The end date must be on or after the start date.');
      return;
    }
    setAvailabilitySaving(true);
    setAvailabilityError('');
    try {
      const payload = { status: 'UNAVAILABLE', start_date: availabilityStart, end_date: availabilityEnd, reason: availabilityReason.trim() || null };
      if (editingAvailabilityId) {
        await driversApi.updateAvailability(editingDriver.id, editingAvailabilityId, payload);
        showSuccess('Time off updated.');
      } else {
        await driversApi.createAvailability(editingDriver.id, payload);
        showSuccess('Time off added.');
      }
      await refreshAvailabilityPeriods(editingDriver.id);
      await refreshTimeline();
      resetAvailabilityForm();
    } catch (err: any) {
      setAvailabilityError(err?.response?.data?.error?.message || 'Could not save this time-off period.');
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const handleDeleteAvailability = async (period: AvailabilityPeriod) => {
    if (!editingDriver || !window.confirm(`Delete time off from ${period.start_date} through ${period.end_date}?`)) return;
    try {
      await driversApi.deleteAvailability(editingDriver.id, period.id);
      await refreshAvailabilityPeriods(editingDriver.id);
      await refreshTimeline();
      if (editingAvailabilityId === period.id) resetAvailabilityForm();
      showSuccess('Time off deleted.');
    } catch (err: any) {
      setAvailabilityError(err?.response?.data?.error?.message || 'Could not delete this time-off period.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
    setFormData(defaultForm);
    setFormError(null);
    setCdlUploadError(null);
    setIsDriverLoading(false);
    setAvailabilityPeriods([]);
    setTinInputActive(false);
    resetAvailabilityForm();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (formData.mailing_state && !/^[A-Za-z]{2}$/.test(formData.mailing_state)) {
      setFormError('Mailing state must be selected from the state list.');
      return;
    }
    if (formData.mailing_zip && !/^\d{5}(?:-\d{4})?$/.test(formData.mailing_zip.trim())) {
      setFormError('ZIP must use 5 digits or ZIP+4 format (12345-6789).');
      return;
    }
    setSaving(true);

    // Build payload - only send non-empty optional fields
    const payload: any = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      license_number: formData.license_number.trim(),
      license_expiry: formData.license_expiry || null,
      cdl_class: formData.cdl_class.trim() || null,
      cdl_endorsements: formData.cdl_endorsements.trim() || null,
      cdl_restrictions: formData.cdl_restrictions.trim() || null,
      cdl_issue_date: formData.cdl_issue_date || null,
      date_of_birth: formData.date_of_birth || null,
      medical_card_expiry: formData.medical_card_expiry || null,
      clearinghouse_renewal_date: formData.clearinghouse_renewal_date || null,
      status: formData.status,
    };
    if (formData.license_state.trim()) payload.license_state = formData.license_state.trim();
    if (formData.phone.trim()) payload.phone = formData.phone.trim();
    if (formData.email.trim()) payload.email = formData.email.trim();
    if (formData.notes.trim()) payload.notes = formData.notes.trim();
    payload.truck_id = formData.truck_id || null;
    payload.trailer_number = formData.trailer_number.trim() || null;
    payload.current_city = formData.current_city.trim() || null;
    payload.current_state = formData.current_state.trim() || null;
    payload.mailing_address = formData.mailing_address.trim() || null;
    payload.mailing_city = formData.mailing_city.trim() || null;
    payload.mailing_state = formData.mailing_state || null;
    payload.mailing_zip = formData.mailing_zip.trim() || null;
    payload.tin = formData.tin.trim() || null;
    payload.default_compensation_type = formData.default_compensation_type;
    payload.default_compensation_rate = formData.default_compensation_rate === '' ? null : Number(formData.default_compensation_rate);
    payload.compensation_rates = formData.compensation_rates.map(rate => ({
      ...rate,
      rate: rate.rate === '' || rate.rate === null ? null : Number(rate.rate),
    }));

    try {
      if (editingDriver) {
        await driversApi.updateDriver(editingDriver.id, payload);
        showSuccess(`Driver ${formData.first_name} updated successfully.`);
      } else {
        const response = await driversApi.createDriver(payload);
        if (response?.data?.portalAccess?.temporaryPassword) {
          setPortalCredentials(response.data.portalAccess);
        }
        showSuccess(`Driver ${formData.first_name} added successfully.`);
      }
      handleCloseModal();
      fetchDrivers();
      void refreshTimeline();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
        || err?.response?.data?.message
        || (err?.response?.data?.error?.details
          ? JSON.stringify(err.response.data.error.details)
          : null)
        || 'Failed to save driver. Please try again.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this driver? Historical records will be preserved and the driver will be archived when required.')) return;
    try {
      setDeletingId(id);
      const response = await driversApi.deleteDriver(id);
      setDrivers(prev => prev.filter(d => d.id !== id));
      if (editingDriver?.id === id) handleCloseModal();
      showSuccess(response?.data?.archived
        ? 'Driver archived. Historical loads and payments were preserved.'
        : 'Driver and unused portal account removed successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to delete driver.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch =
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.license_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.phone || '').includes(searchQuery);
    const effectiveStatus = getCurrentAvailability(d);
    const matchesStatus = filterStatus === 'ALL'
      ? d.status !== 'INACTIVE'
      : filterStatus === 'ACTIVE'
        ? effectiveStatus === 'AVAILABLE'
        : filterStatus === 'ASSIGNED'
          ? effectiveStatus === 'ASSIGNED'
          : filterStatus === 'ON_LEAVE'
            ? effectiveStatus === 'UNAVAILABLE'
            : d.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    ALL: drivers.filter(d => d.status !== 'INACTIVE').length,
    ACTIVE: drivers.filter(d => getCurrentAvailability(d) === 'AVAILABLE').length,
    ASSIGNED: drivers.filter(d => getCurrentAvailability(d) === 'ASSIGNED').length,
    ON_LEAVE: drivers.filter(d => getCurrentAvailability(d) === 'UNAVAILABLE').length,
    INACTIVE: drivers.filter(d => d.status === 'INACTIVE').length,
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Drivers</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>Manage your driver roster</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', maxWidth: '420px', width: '100%' }}>
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9aa6b2', pointerEvents: 'none' }}>
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 40px', border: '1px solid #e6eef8', borderRadius: '8px', fontSize: '14px', background: '#fbfdff' }}
            />
          </div>

          <button
            id="add-driver-btn"
            onClick={() => handleOpenModal()}
            style={{
              background: 'linear-gradient(180deg,#2563eb,#1456d8)', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
              boxShadow: '0 6px 18px rgba(37,99,235,0.18)'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>+ Add Driver</span>
          </button>
        </div>
      </div>

      {/* Success / Error banners */}
      {successMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#166534', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#991b1b', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', marginLeft: '16px' }}>✕</button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['ALL', 'ACTIVE', 'ASSIGNED', 'ON_LEAVE', 'INACTIVE'] as const).map(s => {
          const labels: Record<string, string> = { ALL: 'All', ACTIVE: 'Available', ASSIGNED: 'On Duty', ON_LEAVE: 'On Leave', INACTIVE: 'Inactive' };
          const active = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                border: active ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                background: active ? '#eff6ff' : 'white',
                color: active ? '#2563eb' : '#64748b',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {labels[s]} <span style={{ fontWeight: 700 }}>({counts[s as keyof typeof counts]})</span>
            </button>
          );
        })}
      </div>

      <section style={{ marginBottom: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e6eef8', boxShadow: '0 6px 18px rgba(15,23,42,0.04)', overflow: 'hidden' }} aria-label="Driver availability timeline">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '17px', fontWeight: 650 }}>Availability Timeline</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
              {formatDateOnly(timelineStart)} – {formatDateOnly(timelineEnd, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" aria-label="Previous 14 days" title="Previous" onClick={() => setTimelineStart((value) => shiftDateOnly(value, -14))} style={{ width: '42px', height: '42px', border: '1px solid #dbe2ea', borderRadius: '7px', background: '#f8fafc', color: '#334155', cursor: 'pointer', fontSize: '22px' }}><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => setTimelineStart(toDateOnly(new Date()))} style={{ height: '42px', padding: '0 18px', border: '1px solid #dbe2ea', borderRadius: '7px', background: '#f8fafc', color: '#334155', cursor: 'pointer', fontWeight: 600 }}>Today</button>
            <button type="button" aria-label="Next 14 days" title="Next" onClick={() => setTimelineStart((value) => shiftDateOnly(value, 14))} style={{ width: '42px', height: '42px', border: '1px solid #dbe2ea', borderRadius: '7px', background: '#f8fafc', color: '#334155', cursor: 'pointer', fontSize: '22px' }}><ChevronRight size={20} /></button>
          </div>
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: '820px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(14, minmax(44px, 1fr))', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ position: 'sticky', left: 0, zIndex: 2, padding: '12px 16px', background: '#f8fafc', color: '#64748b', fontWeight: 600 }}>Driver</div>
              {timelineDays.map((day) => {
                const date = fromDateOnly(day);
                const today = day === toDateOnly(new Date());
                return <div key={day} style={{ padding: '9px 2px', textAlign: 'center', borderLeft: '1px solid #e2e8f0', background: today ? '#e8efff' : 'transparent', color: today ? '#1d4ed8' : '#64748b' }}>
                  <div style={{ fontSize: '11px' }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div style={{ fontSize: '14px', fontWeight: today ? 700 : 500 }}>{date.getDate()}</div>
                </div>;
              })}
            </div>
            {timelineLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading availability…</div>
            ) : timelineError ? (
              <div role="alert" style={{ padding: '18px', color: '#b91c1c', fontSize: '13px' }}>{timelineError}</div>
            ) : timelineData.drivers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No active drivers to display.</div>
            ) : timelineData.drivers.map((driver) => (
              <div key={driver.id} style={{ display: 'grid', gridTemplateColumns: '180px repeat(14, minmax(44px, 1fr))', minHeight: '54px', borderBottom: '1px solid #e2e8f0' }}>
                <button type="button" onClick={() => { const fullDriver = drivers.find((item) => item.id === driver.id); if (fullDriver) void handleOpenModal(fullDriver, 'availability'); }} style={{ position: 'sticky', left: 0, zIndex: 1, border: 0, borderRight: '1px solid #e2e8f0', background: 'white', textAlign: 'left', padding: '10px 16px', color: '#1e293b', fontWeight: 550, cursor: 'pointer' }} title="Manage driver availability">
                  {driver.first_name} {driver.last_name}
                </button>
                {timelineDays.map((day) => {
                  const status = getDayStatus(driver.id, day, driver.status);
                  const styles: Record<string, { background: string; text: string; label: string }> = {
                    AVAILABLE: { background: '#d9f4ea', text: '#047857', label: 'Available' },
                    UNAVAILABLE: { background: '#fee2e2', text: '#b91c1c', label: 'Unavailable / Time Off' },
                    ASSIGNED: { background: '#dbeafe', text: '#1d4ed8', label: 'Assigned / On Load' },
                    INACTIVE: { background: '#e5e7eb', text: '#4b5563', label: 'Inactive' },
                  };
                  const cell = styles[status] || styles.AVAILABLE;
                  const reason = timelineData.unavailable.find((period) => period.driver_id === driver.id && period.start_date <= day && period.end_date >= day)?.reason;
                  return <div key={`${driver.id}:${day}`} title={`${cell.label}${reason ? `: ${reason}` : ''}`} aria-label={`${driver.first_name} ${driver.last_name}: ${cell.label}${reason ? `, ${reason}` : ''} on ${day}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #e2e8f0', background: day === toDateOnly(new Date()) ? '#f4f7ff' : 'white' }}>
                    <span style={{ display: 'flex', width: 'calc(100% - 8px)', height: '30px', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', background: cell.background, color: cell.text, fontSize: '10px', fontWeight: 700 }}>{status === 'UNAVAILABLE' ? 'OFF' : status === 'ASSIGNED' ? 'LOAD' : status === 'INACTIVE' ? '—' : '✓'}</span>
                  </div>;
                })}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', padding: '12px 18px', color: '#475569', fontSize: '12px' }}>
          {[['#d9f4ea', 'Available'], ['#fee2e2', 'Unavailable / Time Off'], ['#dbeafe', 'Assigned / On Load'], ['#e5e7eb', 'Inactive']].map(([color, label]) => <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: color, borderRadius: '3px' }} />{label}</span>)}
        </div>
      </section>

      {/* Main Card */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e6eef8', boxShadow: '0 6px 18px rgba(15,23,42,0.04)', overflow: 'hidden' }}>
        {/* Content */}
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
            <p style={{ marginTop: '16px', color: '#94a3b8', fontSize: '14px' }}>Loading drivers...</p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ background: '#f8fafc', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#94a3b8' }}>
              <UsersIcon />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '0 0 8px' }}>
              {searchQuery || filterStatus !== 'ALL' ? 'No drivers found' : 'No drivers yet'}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '300px', lineHeight: 1.6, margin: 0 }}>
              {searchQuery ? `No results for "${searchQuery}".` : filterStatus !== 'ALL' ? `No drivers with this status.` : 'Add your first driver to get started.'}
            </p>
            {!searchQuery && filterStatus === 'ALL' && (
              <button
                onClick={() => handleOpenModal()}
                style={{ marginTop: '20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                + Add First Driver
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  {['Name', 'Phone', 'CDL', 'Truck / Trailer', 'Compensation', 'Availability'].map((h, idx) => (
                    <th key={h} style={{ padding: '12px 18px', textAlign: idx <= 1 ? 'left' : 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'none' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver, i) => (
                  <tr
                    key={driver.id}
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      background: 'white',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = '#f0f9ff')}
                    onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? 'white' : '#fafafa')}
                    onClick={() => handleOpenModal(driver)}
                  >
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }} className={avatarColor(driver.id)}>
                          {getInitials(driver.first_name, driver.last_name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{driver.first_name} {driver.last_name}</div>
                          {driver.email && <div style={{ fontSize: '12px', color: '#6b7280' }}>{driver.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '14px', color: '#374151' }}>{driver.phone || '—'}</div>
                    </td>
                    <td
                      style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      title="Edit CDL details"
                      onClick={(event) => { event.stopPropagation(); void handleOpenModal(driver, 'cdl-details'); }}
                    >
                      <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#374151' }}>{driver.license_number}</div>
                      {driver.license_state && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{driver.license_state}</div>}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '13px', color: '#374151' }}>{driver.truck_unit_number || '—'}<span style={{ margin: '0 6px' }}>/</span>{driver.trailer_number || '—'}</div>
                    </td>
                    <td
                      style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      title="Edit compensation"
                      onClick={(event) => { event.stopPropagation(); void handleOpenModal(driver, 'compensation'); }}
                    >
                      <div style={{ fontSize: '13px', color: '#374151' }}>
                        {driver.default_compensation_type === 'PERCENT_OF_RATE'
                          ? `${Number(driver.default_compensation_rate || 0).toFixed(2)}%`
                          : `$${Number(driver.default_compensation_rate || 0).toFixed(2)}/mi`}
                      </div>
                    </td>
                    <td
                      style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      title="Manage driver availability"
                      onClick={(event) => { event.stopPropagation(); void handleOpenModal(driver, 'availability'); }}
                    >
                      {(() => {
                        const status = getCurrentAvailability(driver);
                        const badge = status === 'UNAVAILABLE'
                          ? { label: 'Unavailable', background: '#fef2f2', border: '#fecaca', color: '#b91c1c' }
                          : status === 'ASSIGNED'
                            ? { label: 'On Load', background: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' }
                            : status === 'INACTIVE'
                              ? { label: 'Inactive', background: '#f3f4f6', border: '#d1d5db', color: '#4b5563' }
                              : { label: 'Available Now', background: '#ecfdf5', border: '#bbf7d0', color: '#065f46' };
                        return <span aria-label={`Current availability: ${badge.label}`} style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '999px', background: badge.background, border: `1px solid ${badge.border}`, color: badge.color, fontWeight: 700, fontSize: '12px' }}>{badge.label}</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={e => { if (e.target === e.currentTarget) handleCloseModal(); }}
        >
          <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', width: '100%', maxWidth: '760px', maxHeight: '92vh', overflow: 'auto' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' }}>
                  {editingDriver ? 'Update driver information below.' : 'Fill in the driver details to add them to your fleet.'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
              >
                <XIcon />
              </button>
            </div>

            {/* Form Error */}
            {formError && (
              <div style={{ margin: '16px 24px 0', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 14px', color: '#991b1b', fontSize: '13px' }}>
                ⚠ {formError}
              </div>
            )}

            {/* Note about ASSIGNED status */}
            {editingDriver?.status === 'ASSIGNED' && (
              <div style={{ margin: '16px 24px 0', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', color: '#1e40af', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <InfoIcon />
                <span>This driver is currently <strong>On Duty</strong> (assigned to a load). Status will return to "Available" automatically when the load is completed or unassigned.</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSave} style={{ padding: '20px 24px 24px' }}>
              {editingDriver && (
                <nav aria-label="Edit driver section" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '14px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                  {[
                    ['personal-details', 'Driver Info'],
                    ['cdl-details', 'CDL Details'],
                    ['equipment-location', 'Truck / Location'],
                    ['mailing-address', 'Mailing Address'],
                    ['availability', 'Availability'],
                    ['compensation', 'Compensation'],
                    ['pay-rates', 'Pay Rates'],
                  ].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => { setFocusedSection(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} style={{ flex: '0 0 auto', padding: '7px 10px', border: focusedSection === id ? '1px solid #93c5fd' : '1px solid #e2e8f0', borderRadius: '7px', background: focusedSection === id ? '#eff6ff' : 'white', color: focusedSection === id ? '#1d4ed8' : '#475569', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>{label}</button>
                  ))}
                </nav>
              )}
              {isDriverLoading ? (
                <div style={{ minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#64748b' }}>
                  <Loader2 size={20} className="animate-spin" /> Loading saved driver information…
                </div>
              ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div id="personal-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', scrollMarginTop: '18px' }}>
                  <div>
                    <label style={labelStyle}>First Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.first_name}
                      onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))}
                      style={inputStyle}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.last_name}
                      onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
                      style={inputStyle}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>License Number *</label>
                  <input
                    required
                    type="text"
                    value={formData.license_number}
                    onChange={e => setFormData(p => ({ ...p, license_number: e.target.value }))}
                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                    placeholder="CDL-12345"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      style={inputStyle}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>License State</label>
                    <select
                      value={formData.license_state}
                      onChange={e => setFormData(p => ({ ...p, license_state: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="">Select state</option>
                      {US_STATES.map(([code]) => <option key={code} value={code}>{code}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                    <label style={labelStyle}>Email *</label>
                    <input
                      required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    style={inputStyle}
                    placeholder="john.doe@example.com"
                  />
                </div>

                <section id="cdl-details" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', background: '#f8fafc', scrollMarginTop: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '17px', color: '#0f172a' }}>CDL Details</h4>
                      <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Upload a photo or PDF of the CDL to auto-fill.</p>
                    </div>
                    <input
                      ref={cdlFileInputRef}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={(event) => {
                        void handleCdlUpload(event.target.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={!editingDriver || isCdlExtracting || isDriverLoading}
                      onClick={() => cdlFileInputRef.current?.click()}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', borderRadius: '7px', background: '#155eef', color: 'white', padding: '11px 16px', fontSize: '14px', fontWeight: 600, cursor: editingDriver ? 'pointer' : 'not-allowed', opacity: editingDriver ? 1 : 0.55 }}
                    >
                      {isCdlExtracting ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
                      {isCdlExtracting ? 'Extracting CDL…' : 'Upload CDL'}
                    </button>
                  </div>
                  {!editingDriver && <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '12px' }}>Save the driver first, then upload a CDL to auto-fill these fields.</p>}
                  {cdlUploadError && <div role="status" style={{ marginBottom: '12px', padding: '9px 11px', borderRadius: '7px', background: '#fff7ed', color: '#9a3412', fontSize: '13px' }}>{cdlUploadError}</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={labelStyle}>Class</label>
                      <input value={formData.cdl_class} onChange={e => setFormData(p => ({ ...p, cdl_class: e.target.value }))} style={inputStyle} placeholder="A" maxLength={32} />
                    </div>
                    <div>
                      <label style={labelStyle}>Endorsements</label>
                      <input value={formData.cdl_endorsements} onChange={e => setFormData(p => ({ ...p, cdl_endorsements: e.target.value }))} style={inputStyle} placeholder="H, N, T" maxLength={255} />
                    </div>
                    <div>
                      <label style={labelStyle}>Restrictions</label>
                      <input value={formData.cdl_restrictions} onChange={e => setFormData(p => ({ ...p, cdl_restrictions: e.target.value }))} style={inputStyle} maxLength={255} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={labelStyle}>Issue Date</label>
                      <input type="date" value={formData.cdl_issue_date} onChange={e => setFormData(p => ({ ...p, cdl_issue_date: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Expiration Date</label>
                      <input type="date" value={formData.license_expiry} onChange={e => setFormData(p => ({ ...p, license_expiry: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Date of Birth</label>
                      <input type="date" value={formData.date_of_birth} onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Medical Card Expiration</label>
                      <input type="date" value={formData.medical_card_expiry} onChange={e => setFormData(p => ({ ...p, medical_card_expiry: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Clearinghouse Renewal Date</label>
                      <input type="date" value={formData.clearinghouse_renewal_date} onChange={e => setFormData(p => ({ ...p, clearinghouse_renewal_date: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                </section>

                <section id="availability" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', background: '#fff', scrollMarginTop: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <CalendarDays size={18} color="#2563eb" />
                    <h4 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>Availability</h4>
                  </div>
                  <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '13px' }}>Add scheduled unavailable dates. Availability returns automatically after the end date.</p>
                  {!editingDriver && <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '12px' }}>Save this driver before adding time off.</p>}
                  {availabilityError && <div role="alert" style={{ marginBottom: '12px', padding: '9px 11px', borderRadius: '7px', background: '#fff7ed', color: '#9a3412', fontSize: '13px' }}>{availabilityError}</div>}
                  {editingDriver && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', alignItems: 'end', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={labelStyle}>Status</label>
                        <input value="Unavailable / Time Off" readOnly style={{ ...inputStyle, background: '#f8fafc' }} />
                      </div>
                      <div>
                        <label style={labelStyle}>From Date</label>
                        <input type="date" value={availabilityStart} onChange={(event) => setAvailabilityStart(event.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>To Date</label>
                        <input type="date" value={availabilityEnd} min={availabilityStart || undefined} onChange={(event) => setAvailabilityEnd(event.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Reason (optional)</label>
                        <input value={availabilityReason} maxLength={255} onChange={(event) => setAvailabilityReason(event.target.value)} style={inputStyle} placeholder="Vacation, personal…" />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" disabled={availabilitySaving} onClick={() => void handleSaveAvailability()} style={{ flex: 1, minHeight: '40px', border: 0, borderRadius: '7px', background: '#155eef', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: availabilitySaving ? 0.6 : 1 }}>{availabilitySaving ? 'Saving…' : editingAvailabilityId ? 'Save Changes' : 'Add Time Off'}</button>
                        {editingAvailabilityId && <button type="button" disabled={availabilitySaving} onClick={resetAvailabilityForm} style={{ minHeight: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '7px', background: 'white', color: '#475569', cursor: 'pointer' }}>Cancel</button>}
                      </div>
                    </div>
                  )}
                  {editingDriver && availabilityPeriods.length > 0 ? (
                    <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                      {availabilityPeriods.map((period) => (
                        <div key={period.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '10px 12px', border: '1px solid #fecaca', borderRadius: '7px', background: '#fffafa' }}>
                          <div>
                            <div style={{ color: '#991b1b', fontWeight: 650, fontSize: '13px' }}>Unavailable · {formatDateOnly(String(period.start_date).slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })} – {formatDateOnly(String(period.end_date).slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            {period.reason && <div style={{ marginTop: '2px', color: '#64748b', fontSize: '12px' }}>{period.reason}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '7px' }}>
                            <button type="button" onClick={() => openAvailabilityEdit(period)} style={{ border: '1px solid #dbeafe', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', padding: '6px 9px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                            <button type="button" onClick={() => void handleDeleteAvailability(period)} style={{ border: '1px solid #fecaca', borderRadius: '6px', background: '#fff1f2', color: '#b91c1c', padding: '6px 9px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : editingDriver ? (
                    <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: '13px' }}>No time-off periods recorded.</p>
                  ) : null}
                </section>

                <div id="equipment-location" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', scrollMarginTop: '18px' }}>
                  <div>
                    <DriverTruckSelector
                      value={formData.truck_id}
                      trucks={trucks}
                      loading={trucksLoading}
                      error={trucksError}
                      onChange={(truckId) => setFormData((previous) => ({ ...previous, truck_id: truckId }))}
                      onRetry={() => void fetchTrucks()}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Trailer #</label>
                    <input value={formData.trailer_number} onChange={e => setFormData(p => ({ ...p, trailer_number: e.target.value }))} style={inputStyle} placeholder="TR-201" />
                  </div>
                  <div>
                    <label style={labelStyle}>Current City</label>
                    <input value={formData.current_city} onChange={e => setFormData(p => ({ ...p, current_city: e.target.value }))} style={inputStyle} placeholder="Dallas" />
                  </div>
                  <div>
                    <label style={labelStyle}>Current State</label>
                    <input value={formData.current_state} onChange={e => setFormData(p => ({ ...p, current_state: e.target.value }))} style={inputStyle} placeholder="TX" maxLength={10} />
                  </div>
                </div>

                <div id="mailing-address" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', scrollMarginTop: '18px' }}>
                  <label style={{ ...labelStyle, fontSize: '19px', marginBottom: '8px' }}>Mailing Address</label>
                  <input
                    type="text"
                    maxLength={255}
                    value={formData.mailing_address}
                    onChange={e => setFormData(p => ({ ...p, mailing_address: e.target.value }))}
                    style={{ ...inputStyle, width: '100%' }}
                    placeholder="123 Main St"
                  />
                  <p style={{ margin: '6px 0 16px', color: '#64748b', fontSize: '13px' }}>Used on 1099-NEC forms.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>City</label>
                      <input
                        type="text"
                        maxLength={100}
                        value={formData.mailing_city}
                        onChange={e => setFormData(p => ({ ...p, mailing_city: e.target.value }))}
                        style={inputStyle}
                        placeholder="Dallas"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>State</label>
                      <select
                        value={formData.mailing_state}
                        onChange={e => setFormData(p => ({ ...p, mailing_state: e.target.value }))}
                        style={inputStyle}
                      >
                        <option value="">State</option>
                        {US_STATES.map(([code]) => <option key={code} value={code}>{code}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>ZIP</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        value={formData.mailing_zip}
                        onChange={e => setFormData(p => ({ ...p, mailing_zip: e.target.value }))}
                        style={inputStyle}
                        placeholder="75001"
                      />
                    </div>
                  </div>
                </div>

                <div id="tax-information" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', scrollMarginTop: '18px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>Tax Information</h4>
                  <div>
                    <label style={labelStyle}>Tax Identification Number (TIN)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        value={getTinFieldValue()}
                        onFocus={() => {
                          if (formData.tin) {
                            setTinInputActive(true);
                          }
                        }}
                        onBlur={() => {
                          setTinInputActive(false);
                        }}
                        onChange={e => {
                          const next = e.target.value.replace(/\D/g, '');
                          setTinInputActive(true);
                          setFormData(p => ({ ...p, tin: next }));
                        }}
                        style={inputStyle}
                        placeholder="XXX-XX-1234"
                        maxLength={11}
                      />
                    </div>
                  </div>
                </div>

                <div id="compensation" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', scrollMarginTop: '18px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>Compensation</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Default Pay Type</label>
                      <select value={formData.default_compensation_type} onChange={e => setFormData(p => ({ ...p, default_compensation_type: e.target.value as FormData['default_compensation_type'] }))} style={inputStyle}>
                        <option value="PER_MILE">Per Mile</option>
                        <option value="PERCENT_OF_RATE">% of Rate</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>{formData.default_compensation_type === 'PER_MILE' ? '$/Mile' : '% of Rate'}</label>
                      <input type="number" min="0" max={formData.default_compensation_type === 'PERCENT_OF_RATE' ? 100 : undefined} step="0.01" value={formData.default_compensation_rate} onChange={e => setFormData(p => ({ ...p, default_compensation_rate: e.target.value }))} style={inputStyle} placeholder={formData.default_compensation_type === 'PER_MILE' ? '0.55' : '50'} />
                    </div>
                  </div>
                </div>

                <div id="pay-rates" style={{ scrollMarginTop: '18px' }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>Pay Rates by Load Type</h4>
                  <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '12px' }}>Leave the rate blank to inherit the driver default.</p>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {formData.compensation_rates.map((rate, index) => (
                      <div key={rate.load_type} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'end' }}>
                        <div>
                          <label style={labelStyle}>{rate.load_type.replace('_', ' ')}</label>
                          <select value={rate.pay_type} onChange={e => setFormData(p => ({ ...p, compensation_rates: p.compensation_rates.map((item, itemIndex) => itemIndex === index ? { ...item, pay_type: e.target.value as CompensationRate['pay_type'] } : item) }))} style={inputStyle}>
                            <option value="PER_MILE">Per Mile</option>
                            <option value="PERCENT_OF_RATE">% of Rate</option>
                          </select>
                        </div>
                        <input type="number" min="0" max={rate.pay_type === 'PERCENT_OF_RATE' ? 100 : undefined} step="0.01" value={rate.rate ?? ''} onChange={e => setFormData(p => ({ ...p, compensation_rates: p.compensation_rates.map((item, itemIndex) => itemIndex === index ? { ...item, rate: e.target.value } : item) }))} style={inputStyle} placeholder={rate.pay_type === 'PER_MILE' ? 'Default' : 'Default %'} />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    Status
                    {editingDriver?.status === 'ASSIGNED' && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                        "On Duty" is auto-managed
                      </span>
                    )}
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(p => ({ ...p, status: e.target.value as FormData['status'] }))}
                    style={inputStyle}
                  >
                    <option value="ACTIVE">Available (Active)</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: '72px', fontFamily: 'inherit' }}
                    placeholder="Any additional notes about this driver..."
                    rows={3}
                  />
                </div>
              </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                {editingDriver && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingDriver.id)}
                    disabled={saving || deletingId === editingDriver.id}
                    style={{ marginRight: 'auto', padding: '10px 14px', fontSize: '14px', fontWeight: 600, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', cursor: 'pointer' }}
                  >
                    {deletingId === editingDriver.id ? 'Removing...' : 'Remove Driver'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 500, color: '#374151', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || isDriverLoading}
                  style={{
                    padding: '10px 24px', fontSize: '14px', fontWeight: 600, color: 'white',
                    background: saving ? '#93c5fd' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 4px 12px rgba(59,130,246,0.35)',
                    transition: 'all 0.2s',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  {saving ? (
                    <>
                      <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      Saving...
                    </>
                  ) : (
                    editingDriver ? 'Save Changes' : 'Add Driver'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select { appearance: auto; }
      `}</style>

      {portalCredentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Driver Created Successfully</h2>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '13px' }}>Give these temporary credentials to the driver. They will be asked to create a new password at first login.</p>
            </div>
            <div style={{ display: 'grid', gap: '12px', borderRadius: '12px', background: '#f8fafc', padding: '16px' }}>
              <div><div style={labelStyle}>Email</div><div style={{ color: '#0f172a', fontWeight: 600 }}>{portalCredentials.email}</div></div>
              <div><div style={labelStyle}>Temporary Password</div><div style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, letterSpacing: '0.04em' }}>{portalCredentials.temporaryPassword}</div></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(`Driver Portal Login\nEmail: ${portalCredentials.email}\nTemporary Password: ${portalCredentials.temporaryPassword}\nDriver Portal: ${window.location.origin}/login`)}
                style={{ padding: '10px 14px', borderRadius: '9px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
              >Copy Login Details</button>
              <button type="button" onClick={() => setPortalCredentials(null)} style={{ padding: '10px 18px', borderRadius: '9px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared styles
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '9px',
  fontSize: '14px', color: '#0f172a', outline: 'none', background: 'white',
  transition: 'border-color 0.2s', boxSizing: 'border-box',
};

export { DriversPage };
