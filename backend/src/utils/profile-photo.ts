import path from 'path';
import { loadImage } from '@napi-rs/canvas';
import { ValidationError } from './errors';

export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const imageTypes = {
  'image/jpeg': {
    extension: 'jpg',
    matches: (buffer: Buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    matches: (buffer: Buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    extension: 'webp',
    matches: (buffer: Buffer) => buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
  },
} as const;

export async function validateProfilePhoto(buffer: Buffer, declaredMimeType: string) {
  if (buffer.length === 0 || buffer.length > PROFILE_PHOTO_MAX_BYTES) {
    throw new ValidationError('Profile photo must be an image no larger than 5 MB');
  }

  const imageType = imageTypes[declaredMimeType as keyof typeof imageTypes];
  if (!imageType || !imageType.matches(buffer)) {
    throw new ValidationError('Invalid image content. Use a JPEG, PNG, or WebP image.');
  }

  try {
    const image = await loadImage(buffer);
    if (image.width < 1 || image.height < 1 || image.width * image.height > 25_000_000) {
      throw new ValidationError('Profile photo dimensions are not supported');
    }
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError('The selected file is not a valid image');
  }

  return { extension: imageType.extension, mimeType: declaredMimeType };
}

export function profilePhotoMimeType(storageKey: string) {
  const extension = path.extname(storageKey).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  throw new ValidationError('Unsupported profile photo format');
}
