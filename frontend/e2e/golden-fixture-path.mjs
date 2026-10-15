import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const candidatePaths = [
  process.env.GOLDEN_RATE_CONFIRMATION_PATH,
  '/mnt/data/semail (20).pdf',
  '/mnt/data/semail (20).PDF',
  resolve('e2e/fixtures/semail (20).pdf'),
  resolve('e2e/fixtures/semail (20).PDF'),
  resolve('frontend/e2e/fixtures/semail (20).pdf'),
  resolve('frontend/e2e/fixtures/semail (20).PDF'),
].filter((value) => Boolean(value));

export const goldenRateConfirmationPath = (() => {
  const match = candidatePaths.find((candidate) => existsSync(candidate));
  if (match) return match;

  const expected = '/mnt/data/semail (20).pdf';
  throw new Error(
    `Golden rate confirmation PDF not found. Mount the real scanned document at ${expected} or set GOLDEN_RATE_CONFIRMATION_PATH before running the Golden E2E test.`
  );
})();
