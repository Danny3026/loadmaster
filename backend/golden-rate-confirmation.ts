import fs from 'node:fs/promises';
import path from 'node:path';
import { extractionService } from './src/services/extraction.service';

const fixture = path.resolve('fixtures/golden/axle-logistics-rate-con-3506188.pdf');
const expected = {
  load_id: '3506188',
  carrier_name: 'AGGREY EXPRESS',
  broker_name: 'Axle Logistics, LLC',
  total_rate: 1700,
  miles: 811,
  commodity: 'Building Materials',
  equipment_type: 'Straight Box Truck',
  weight: 2500,
  pickup_date: '2026-08-07',
  delivery_date: '2026-08-10',
};

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();
const matches = (field: string, actual: unknown, target: unknown) => {
  const actualValue = normalize(actual);
  const targetValue = normalize(target);
  if (!actualValue || !targetValue) return false;
  return field === 'broker_name'
    ? actualValue.includes(targetValue) || targetValue.includes(actualValue)
    : actualValue === targetValue;
};

(async () => {
  const result = await extractionService.extractRateConfirmation(await fs.readFile(fixture), 'application/pdf');
  const actual = {
    load_id: result.load_id,
    carrier_name: result.carrier_name,
    broker_name: result.broker_name,
    total_rate: result.total_rate,
    miles: result.miles,
    commodity: result.commodity,
    equipment_type: result.equipment_type,
    weight: result.weight,
    pickup_date: result.pickup_stops[0]?.date ?? null,
    delivery_date: result.delivery_stops[0]?.date ?? null,
  };
  const comparisons = Object.fromEntries(Object.entries(expected).map(([field, target]) => [field, {
    expected: target,
    actual: actual[field as keyof typeof actual],
    pass: matches(field, actual[field as keyof typeof actual], target),
  }]));
  const passed = Object.values(comparisons).filter((comparison) => comparison.pass).length;

  console.log(JSON.stringify({ fixture, extraction_method: result._meta.extraction_method, overall_confidence: result._meta.overall_confidence, actual, comparisons, passed, total: Object.keys(expected).length }, null, 2));
  if (passed !== Object.keys(expected).length) process.exitCode = 1;
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});