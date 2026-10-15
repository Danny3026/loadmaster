import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Upload, Save, RotateCcw, MessageSquareText } from 'lucide-react';
import { useCompany, useUpdateCompany, useUploadCompanyLogo } from '@/hooks/useCompany';
import { useToast } from '@/contexts/ToastContext';
import { US_STATES } from '@/constants/usStates';
import { CompanyLogo } from '@/components/company/CompanyLogo';
import { useLoads } from '@/hooks/useLoads';

const DEFAULT_TEMPLATE = `New Dispatch from {{company_name}}
Load #{{load_number}}
Pickup: {{pickup_location}}
{{pickup_date}}
Delivery: {{delivery_location}}
{{delivery_date}}
Miles: {{miles}}
Open the driver app for full details.`;

const PLACEHOLDERS = [
  'company_name',
  'load_number',
  'driver_name',
  'pickup_location',
  'pickup_date',
  'delivery_location',
  'delivery_date',
  'miles',
  'broker_name',
  'commodity',
];

const buildPreview = (template: string, values: Record<string, string>) => template
  .replace(/{{\s*([a-zA-Z_]+)\s*}}/g, (_match, key: string) => values[key] ?? '');

const formatPreviewDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

const getStops = (load: any, type: 'PICKUP' | 'DELIVERY') =>
  (load?.stops || []).find((stop: any) => stop.stop_type === type);

export default function SettingsPage() {
  const { data: company, isLoading } = useCompany();
  const { data: loadsResponse } = useLoads({ page: 1, limit: 1 });
  const updateCompanyMutation = useUpdateCompany();
  const uploadLogoMutation = useUploadCompanyLogo();
  const { showError, showSuccess } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const templateInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [formData, setFormData] = useState({
    name: 'Danny Transport',
    mcNumber: '',
    dotNumber: '',
    addressLine1: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    tin: '',
    brandColor: '#1a5fb4',
  });
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [savedTemplate, setSavedTemplate] = useState(DEFAULT_TEMPLATE);
  const [templateDirty, setTemplateDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const settingsBrandColor = /^#[0-9a-f]{6}$/i.test(formData.brandColor)
    ? formData.brandColor
    : company?.brandColor || '#1a5fb4';
  const settingsBrandStyle: React.CSSProperties & { '--company-brand-color': string } = {
    '--company-brand-color': settingsBrandColor,
  };

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || 'Danny Transport',
        mcNumber: company.mcNumber || '',
        dotNumber: company.dotNumber || '',
        addressLine1: company.addressLine1 || '',
        city: company.city || '',
        state: company.state || '',
        zipCode: company.zipCode || '',
        phone: company.phone || '',
        email: company.email || '',
        tin: '',
        brandColor: company.brandColor || '#1a5fb4',
      });
      const storedTemplate = company.dispatchNotificationTemplate || DEFAULT_TEMPLATE;
      setSavedTemplate(storedTemplate);
      if (!templateDirty) {
        setTemplate(storedTemplate);
        setTemplateDirty(false);
      }
    }
  }, [company, templateDirty]);

  const previewLoad = loadsResponse?.data?.[0] as any;
  const pickup = getStops(previewLoad, 'PICKUP');
  const delivery = getStops(previewLoad, 'DELIVERY');
  const previewValues: Record<string, string> = {
    company_name: company?.name || '',
    load_number: previewLoad?.load_number || '',
    driver_name: `${previewLoad?.driver_first_name || ''} ${previewLoad?.driver_last_name || ''}`.trim(),
    pickup_location: pickup ? [pickup.facility_name, pickup.city, pickup.state].filter(Boolean).join(', ') : previewLoad?.origin || '',
    pickup_date: formatPreviewDate(pickup?.appointment_date || previewLoad?.pickup_date),
    delivery_location: delivery ? [delivery.facility_name, delivery.city, delivery.state].filter(Boolean).join(', ') : previewLoad?.destination || '',
    delivery_date: formatPreviewDate(delivery?.appointment_date || previewLoad?.delivery_date),
    miles: previewLoad?.loaded_miles ? String(previewLoad.loaded_miles) : '',
    broker_name: previewLoad?.broker_name || '',
    commodity: previewLoad?.commodity || '',
    rate: '',
  };
  const previewText = useMemo(() => buildPreview(template, previewValues), [template, company, previewLoad]);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    if (!formData.name.trim()) {
      showError('Legal business name is required.');
      return;
    }
    if (formData.tin.trim() && !/^\d{2}-?\d{7}$/.test(formData.tin.trim())) {
      showError('EIN must contain nine digits in the format XX-XXXXXXX.');
      return;
    }
    if (formData.zipCode.trim() && !/^\d{5}(?:-\d{4})?$/.test(formData.zipCode.trim())) {
      showError('Business ZIP must use 5 digits or ZIP+4 format (12345-6789).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        mc_number: formData.mcNumber,
        dot_number: formData.dotNumber,
        address_line1: formData.addressLine1,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        phone: formData.phone,
        email: formData.email,
        brand_color: formData.brandColor,
        ...(formData.tin.trim() ? { tin: formData.tin.trim() } : {}),
      };
      await updateCompanyMutation.mutateAsync(payload);
      setFormData((current) => ({ ...current, tin: '' }));
      showSuccess('Company settings updated');
    } catch (error) {
      // handled by mutation
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showError('Choose a PNG, JPG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Logo must be 5MB or less.');
      return;
    }

    try {
      await uploadLogoMutation.mutateAsync(file);
    } catch (error) {
      // handled by mutation
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const exact = `{{${placeholder}}}`;
    const textarea = templateInputRef.current;
    const start = textarea?.selectionStart ?? template.length;
    const end = textarea?.selectionEnd ?? template.length;
    const next = template.slice(0, start) + exact + template.slice(end);
    setTemplate(next);
    setTemplateDirty(true);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + exact.length, start + exact.length);
    });
  };

  const handleTemplateSave = async () => {
    if (!template.trim()) {
      showError('Dispatch notification template cannot be empty.');
      return;
    }
    if (template.length > 4000) {
      showError('Dispatch notification template must be 4,000 characters or fewer.');
      return;
    }
    const unknown = [...new Set([...template.matchAll(/{{\s*([a-zA-Z_]+)\s*}}/g)]
      .map((match) => match[1])
      .filter((name) => !PLACEHOLDERS.includes(name) && name !== 'rate'))];
    if (unknown.length) {
      showError(`Unsupported placeholder(s): ${unknown.join(', ')}.`);
      return;
    }
    try {
      const updated = await updateCompanyMutation.mutateAsync({
        dispatch_notification_template: template,
      });
      const persistedTemplate = updated?.dispatchNotificationTemplate || template;
      setTemplate(persistedTemplate);
      setSavedTemplate(persistedTemplate);
      setTemplateDirty(false);
      showSuccess('Dispatch template saved');
    } catch (error) {
      // handled by mutation
    }
  };

  const handleTemplateReset = () => {
    if (templateDirty && !window.confirm('Discard unsaved template edits and save the default dispatch message?')) return;
    void updateCompanyMutation.mutateAsync({ dispatch_notification_template: DEFAULT_TEMPLATE })
      .then((updated) => {
        const persistedTemplate = updated?.dispatchNotificationTemplate || DEFAULT_TEMPLATE;
        setTemplate(persistedTemplate);
        setSavedTemplate(persistedTemplate);
        setTemplateDirty(false);
        showSuccess('Dispatch template reset to default');
      })
      .catch(() => undefined);
  };

  if (isLoading) {
    return <div className="p-6 text-slate-500">Loading company settings…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-20" style={settingsBrandStyle}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Company Settings</h1>
        <p className="text-slate-500 mt-1">Manage your company profile and branding</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl brand-primary-soft-bg flex items-center justify-center brand-primary-text">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Company Identity</h2>
              <p className="text-sm text-slate-500">Update your business identity and branding</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 mb-6">
            <h3 className="text-[30px] font-bold text-slate-900 mb-4">Company Logo</h3>
            <div className="flex items-center gap-6">
              <div className="w-28 h-28 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                {company?.logoUrl ? (
                  <CompanyLogo
                    logoUrl={company.logoUrl}
                    companyName={company.name}
                    className="h-full w-full object-cover"
                    fallbackClassName="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400"
                  />
                ) : (
                  <div className="text-slate-400">
                    <Upload className="h-9 w-9 mx-auto" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label
                  className="inline-flex items-center justify-center px-4 py-3 rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                  htmlFor="company-logo-upload"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload logo
                </label>
                <input
                  id="company-logo-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="text-slate-500 mt-3">PNG, JPG, or WebP. Max 5MB.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-[30px] font-bold text-slate-900 mb-2">Payer Tax Information</h3>
            <p className="mb-6 text-sm text-slate-600">This company profile is the source of truth for payer details used by Taxes.</p>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Legal Business Name</label>
                <input value={formData.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2" htmlFor="company-tin">EIN/TIN</label>
                <input
                  id="company-tin"
                  value={formData.tin}
                  onChange={(e) => updateField('tin', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  placeholder="XX-XXXXXXX"
                  aria-describedby="company-tin-help"
                />
                <p id="company-tin-help" className="mt-2 text-sm text-slate-600">
                  {company?.tinConfigured
                    ? `EIN on file: ${company.tinMasked}. Leave blank to keep it unchanged; enter a new EIN to replace it.`
                    : 'No EIN/TIN is on file. Enter a U.S. EIN to configure payer tax information.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Business Mailing Address</label>
                <input value={formData.addressLine1} onChange={(e) => updateField('addressLine1', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                  <input value={formData.city} onChange={(e) => updateField('city', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                  <select value={formData.state} onChange={(e) => updateField('state', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select state</option>
                    {US_STATES.map(([code, name]) => <option key={code} value={code}>{code} — {name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ZIP</label>
                  <input value={formData.zipCode} onChange={(e) => updateField('zipCode', e.target.value)} maxLength={10} inputMode="numeric" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="mb-4 text-lg font-semibold text-slate-900">Company and Carrier Details</h4>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">MC Number</label>
                      <input value={formData.mcNumber} onChange={(e) => updateField('mcNumber', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">DOT Number</label>
                      <input value={formData.dotNumber} onChange={(e) => updateField('dotNumber', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                      <input value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Brand Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={formData.brandColor} onChange={(e) => updateField('brandColor', e.target.value)} className="h-12 w-16 rounded-lg border border-slate-300 bg-white p-1" />
                      <input value={formData.brandColor} onChange={(e) => updateField('brandColor', e.target.value)} className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveChanges}
                disabled={saving || updateCompanyMutation.isPending}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl brand-primary-bg brand-button px-4 py-3 text-lg font-semibold text-white shadow-sm disabled:opacity-70"
              >
                <Save className="h-5 w-5 mr-2" />
                {saving || updateCompanyMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl brand-primary-soft-bg flex items-center justify-center brand-primary-text">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[30px] font-bold text-slate-900">Dispatch Notification Template</h3>
              <p className="text-slate-500">Customize the message sent to drivers</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5">
            <textarea
              id="dispatch-template"
              value={template}
              onChange={(e) => {
                setTemplate(e.target.value);
                setTemplateDirty(e.target.value !== savedTemplate);
              }}
              ref={templateInputRef}
              className="w-full min-h-[260px] resize-none border-0 bg-transparent font-mono text-[15px] leading-7 text-slate-700 focus:outline-none"
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {PLACEHOLDERS.map((placeholder) => (
              <button
                key={placeholder}
                type="button"
                onClick={() => insertPlaceholder(placeholder)}
                className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
              >
                {{ company_name: 'company_name', load_number: 'load_number', driver_name: 'driver_name', pickup_location: 'pickup_location', pickup_date: 'pickup_date', delivery_location: 'delivery_location', delivery_date: 'delivery_date', miles: 'miles', broker_name: 'broker_name', commodity: 'commodity' }[placeholder]}
              </button>
            ))}
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-xl font-bold text-slate-900 mb-1">Live Preview</h4>
            <p className="mb-4 text-sm text-slate-500">Uses your latest company load and its current assignment.</p>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
                <div className="h-10 w-10 rounded-full brand-primary-bg text-white flex items-center justify-center font-bold text-sm">
                  {formData.name?.charAt(0)?.toUpperCase() || 'D'}
                </div>
                <div className="text-slate-700 text-lg">{formData.name || 'Danny Transport'}</div>
              </div>
              <div className="whitespace-pre-line text-[15px] leading-7 text-slate-800 font-medium">{previewText}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTemplateReset}
              disabled={updateCompanyMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-lg font-semibold text-slate-700 hover:bg-slate-100"
            >
              <RotateCcw className="h-5 w-5" />
              Reset to default
            </button>
            <button
              type="button"
              onClick={handleTemplateSave}
              disabled={!templateDirty || updateCompanyMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl brand-primary-bg brand-button px-5 py-3 text-lg font-semibold text-white disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { SettingsPage };
