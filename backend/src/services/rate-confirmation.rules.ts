export interface RateConfirmationRuleResult {
  detention_amount: number;
  calculated_rate: number | null;
  rate_discrepancy_amount: number | null;
  flags: string[];
}

const numberValue = (fields: Record<string, { value: unknown }>, name: string) => {
  const value = fields[name]?.value;
  return typeof value === 'number' ? value : Number(value) || null;
};

export const evaluateRateConfirmation = (
  fields: Record<string, { value: unknown }>,
  options: { freeDetentionHours?: number; discrepancyTolerance?: number } = {},
): RateConfirmationRuleResult => {
  const freeDetentionHours = options.freeDetentionHours ?? 2;
  const discrepancyTolerance = options.discrepancyTolerance ?? 1;
  const totalRate = numberValue(fields, 'total_rate');
  const miles = numberValue(fields, 'miles');
  const ratePerMile = numberValue(fields, 'rate_per_mile');
  const fuel = numberValue(fields, 'fuel_surcharge') || 0;
  const accessorials = numberValue(fields, 'accessorials') || 0;
  const calculatedRate = miles && ratePerMile ? miles * ratePerMile + fuel + accessorials : null;
  const flags: string[] = [];

  if (calculatedRate !== null && totalRate !== null && Math.abs(totalRate - calculatedRate) > discrepancyTolerance) {
    flags.push('RATE_DISCREPANCY');
  }
  if (fields.detention_hours?.value && Number(fields.detention_hours.value) > freeDetentionHours && !fields.detention_rate?.value) {
    flags.push('DETENTION_RATE_MISSING');
  }
  if (!miles || miles <= 0) flags.push('MILES_MISSING');
  if (totalRate !== null && totalRate < 0) flags.push('NEGATIVE_TOTAL_RATE');

  return {
    detention_amount: Math.max(0, (Number(fields.detention_hours?.value) || 0) - freeDetentionHours) * (numberValue(fields, 'detention_rate') || 0),
    calculated_rate: calculatedRate,
    rate_discrepancy_amount: calculatedRate !== null && totalRate !== null ? totalRate - calculatedRate : null,
    flags,
  };
};