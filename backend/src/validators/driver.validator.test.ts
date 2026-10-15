import { describe, expect, it } from 'vitest';
import { createDriverSchema } from './driver.validator';

const validDriver = {
  first_name: 'Jordan',
  last_name: 'Taylor',
  license_number: 'CDL-12345',
  email: 'jordan@example.com',
};

describe('driver mailing address validation', () => {
  it('accepts an optional mailing address with a state code and ZIP+4', () => {
    const result = createDriverSchema.safeParse({
      body: {
        ...validDriver,
        mailing_address: '123 Main St, Apt 4',
        mailing_city: 'Dallas',
        mailing_state: 'TX',
        mailing_zip: '75001-1234',
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid mailing state and ZIP formats', () => {
    const result = createDriverSchema.safeParse({
      body: {
        ...validDriver,
        mailing_state: 'Texas',
        mailing_zip: '7500',
      },
    });

    expect(result.success).toBe(false);
  });
});