import { describe, expect, it } from 'vitest';

import {
  CompressImageForUploadError,
  compressImageForUpload,
} from './compressImageForUpload';

function imageFile(size: number, name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('compressImageForUpload', () => {
  it('rejects files over 10 MB', async () => {
    const file = imageFile(10 * 1024 * 1024 + 1);
    await expect(compressImageForUpload(file)).rejects.toMatchObject({
      code: 'file_too_large',
    });
    await expect(compressImageForUpload(file)).rejects.toBeInstanceOf(
      CompressImageForUploadError
    );
  });

  it('rejects non-image files', async () => {
    const file = new File([new Uint8Array(100)], 'notes.pdf', { type: 'application/pdf' });
    await expect(compressImageForUpload(file)).rejects.toMatchObject({
      code: 'not_an_image',
    });
  });

  it('accepts HEIC by file extension when type is empty', async () => {
    const file = new File([new Uint8Array(100)], 'scan.HEIC', { type: '' });
    await expect(compressImageForUpload(file)).rejects.toMatchObject({
      code: 'processing_failed',
    });
  });

  it('fails processing when document is unavailable (node test env)', async () => {
    const file = imageFile(100);
    await expect(compressImageForUpload(file)).rejects.toMatchObject({
      code: 'processing_failed',
    });
  });
});
