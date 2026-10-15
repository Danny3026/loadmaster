import { describe, expect, it } from 'vitest';
import { getLogoExtension } from './logo-image';

describe('getLogoExtension', () => {
  it('accepts PNG, JPEG, and WebP signatures', () => {
    expect(getLogoExtension(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
    expect(getLogoExtension(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('jpg');
    expect(getLogoExtension(Buffer.from('RIFFxxxxWEBP', 'ascii'))).toBe('webp');
  });

  it('rejects content that only claims to be an image by its MIME type', () => {
    expect(getLogoExtension(Buffer.from('not an image'))).toBeNull();
  });
});