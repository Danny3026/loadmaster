export const LOAD_TYPES = [
  'FLATBED',
  'REEFER',
  'DRY_VAN',
  'STEP_DECK',
  'BOX_TRUCK',
  'POWER_ONLY',
  'HOTSHOT',
  'TANKER',
  'CONESTOGA',
  'LOWBOY_RGN',
  'SPRINTER_VAN',
  'OTHER',
] as const;

export type LoadType = (typeof LOAD_TYPES)[number];

const EQUIPMENT_TYPE_ALIASES: Record<string, LoadType> = {
  'box truck': 'BOX_TRUCK',
  'straight box truck': 'BOX_TRUCK',
  'straight truck': 'BOX_TRUCK',
  'dry van': 'DRY_VAN',
  'dryvan': 'DRY_VAN',
  'van': 'DRY_VAN',
  "53' van": 'DRY_VAN',
  '53 foot van': 'DRY_VAN',
  'reefer': 'REEFER',
  'refrigerated': 'REEFER',
  'refrigerated van': 'REEFER',
  'temp controlled': 'REEFER',
  'flatbed': 'FLATBED',
  'flat bed': 'FLATBED',
  'fb': 'FLATBED',
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
  'sprinter van': 'SPRINTER_VAN',
  'sprinter': 'SPRINTER_VAN',
};

export const normalizeEquipmentType = (value?: string | null): { equipmentType: LoadType; raw?: string } => {
  const raw = value?.trim();
  if (!raw) return { equipmentType: 'OTHER' };

  const canonical = raw.toUpperCase().replace(/[\s-]+/g, '_');
  if (canonical === 'HOT_SHOT') return { equipmentType: 'HOTSHOT', raw };
  if ((LOAD_TYPES as readonly string[]).includes(canonical)) return { equipmentType: canonical as LoadType, raw };

  const alias = EQUIPMENT_TYPE_ALIASES[raw.toLowerCase()];
  if (alias) return { equipmentType: alias, raw };

  return { equipmentType: 'OTHER', raw };
};