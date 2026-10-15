export const LOAD_TYPE_OPTIONS = [
  { label: 'Flatbed', value: 'FLATBED' },
  { label: 'Reefer', value: 'REEFER' },
  { label: 'Dry Van', value: 'DRY_VAN' },
  { label: 'Power Only', value: 'POWER_ONLY' },
  { label: 'Box Truck', value: 'BOX_TRUCK' },
  { label: 'Sprinter Van', value: 'SPRINTER_VAN' },
  { label: 'Hotshot', value: 'HOTSHOT' },
  { label: 'Step Deck', value: 'STEP_DECK' },
  { label: 'Tanker', value: 'TANKER' },
  { label: 'Conestoga', value: 'CONESTOGA' },
  { label: 'Lowboy / RGN', value: 'LOWBOY_RGN' },
  { label: 'Other', value: 'OTHER' },
] as const;

const EQUIPMENT_TYPE_ALIASES: Record<string, string> = {
  'box truck': 'BOX_TRUCK',
  'straight box truck': 'BOX_TRUCK',
  'straight truck': 'BOX_TRUCK',
  'dry van': 'DRY_VAN',
  'dryvan': 'DRY_VAN',
  'reefer': 'REEFER',
  'refrigerated van': 'REEFER',
  'flatbed': 'FLATBED',
  'flat bed': 'FLATBED',
  'step deck': 'STEP_DECK',
  'stepdeck': 'STEP_DECK',
  'power only': 'POWER_ONLY',
  'power-only': 'POWER_ONLY',
  'hot shot': 'HOTSHOT',
  'hotshot': 'HOTSHOT',
  'tanker': 'TANKER',
  'conestoga': 'CONESTOGA',
  'rolling tarp': 'CONESTOGA',
  'rgn': 'LOWBOY_RGN',
  'lowboy': 'LOWBOY_RGN',
  'low boy': 'LOWBOY_RGN',
  'lowboy rgn': 'LOWBOY_RGN',
  'lowboy_rgn': 'LOWBOY_RGN',
  'sprinter van': 'SPRINTER_VAN',
};

export const normalizeLoadType = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const canonical = LOAD_TYPE_OPTIONS.find((option) => option.value === normalized)?.value;
  if (canonical) return canonical;

  const alias = EQUIPMENT_TYPE_ALIASES[value.trim().toLowerCase()];
  return alias || undefined;
};

export const LOAD_TYPE_FILTER_OPTIONS = [
  { label: 'All Types', value: '' },
  ...LOAD_TYPE_OPTIONS,
] as const;