import fs from 'node:fs/promises';
import path from 'node:path';
import { extractionService } from './src/services/extraction.service';

type GroundTruth = Record<string, Record<string, unknown>>;

const fixtureDirectory = process.argv[2];
const groundTruthPath = process.argv[3];

if (!fixtureDirectory || !groundTruthPath) {
  throw new Error('Usage: tsx audit-rate-confirmations.ts <fixture-directory> <ground-truth.json>');
}

const groundTruth = JSON.parse(await fs.readFile(groundTruthPath, 'utf8')) as GroundTruth;
const files = (await fs.readdir(fixtureDirectory)).filter((file) => /\.(pdf|png|jpe?g)$/i.test(file));
if (files.length === 0) throw new Error('No PDF or image fixtures found');

const totals = new Map<string, { correct: number; total: number; errors: string[] }>();
for (const file of files) {
  const expected = groundTruth[file];
  if (!expected) continue;
  const buffer = await fs.readFile(path.join(fixtureDirectory, file));
  const actual = await extractionService.extractStructured(buffer, file.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  for (const [field, expectedValue] of Object.entries(expected)) {
    const stats = totals.get(field) || { correct: 0, total: 0, errors: [] };
    const actualValue = actual.fields[field]?.value ?? null;
    stats.total += 1;
    if (String(actualValue ?? '') === String(expectedValue ?? '')) stats.correct += 1;
    else stats.errors.push(`${file}: expected=${String(expectedValue)} actual=${String(actualValue)}`);
    totals.set(field, stats);
  }
}

console.log(JSON.stringify(Object.fromEntries([...totals].map(([field, stats]) => [field, {
  accuracy_percent: stats.total ? Number((stats.correct / stats.total * 100).toFixed(2)) : 0,
  samples: stats.total,
  errors: stats.errors,
}])), null, 2));