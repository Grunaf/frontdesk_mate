import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/db', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn(async () => ({ error: null })),
      }),
    },
  },
}));

import { createUploadMemoriesAction, UploadMemoriesError } from './action';

function createFormData(files: File[], instagram = '') {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  formData.append('instagram', instagram);
  return formData;
}

describe('uploadMemoriesAction', () => {
  it('returns error when no files provided', async () => {
    const uploadFile = vi.fn(async () => ({ error: null }));
    const action = createUploadMemoriesAction(uploadFile);
    const formData = createFormData([]);

    const result = await action(formData);

    expect(result).toEqual({ success: false, errorKey: 'noFiles' });
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('uploads all files and returns success', async () => {
    const uploadFile = vi.fn(async () => ({ error: null }));
    const action = createUploadMemoriesAction(uploadFile);
    const files = [
      new File(['image-content'], 'room.jpg', { type: 'image/jpeg' }),
      new File(['video-content'], 'tour.mp4', { type: 'video/mp4' }),
    ];

    const result = await action(createFormData(files, '@guest'));

    expect(result).toEqual({ success: true });
    expect(uploadFile).toHaveBeenCalledTimes(2);

    expect(uploadFile).toHaveBeenCalledWith(expect.stringMatching(/^image\//), expect.any(File));
    expect(uploadFile).toHaveBeenCalledWith(expect.stringMatching(/^videos\//), expect.any(File));
  });

  it('returns friendly error when uploader returns provider error', async () => {
    const uploadFile = vi.fn(async () => ({ error: { message: 'provider down' } }));
    const action = createUploadMemoriesAction(uploadFile);
    const files = [new File(['x'], 'room.jpg', { type: 'image/jpeg' })];

    const result = await action(createFormData(files));

    expect(result).toEqual({ success: false, errorKey: 'uploadFailed' });
  });

  it('returns timeout error when uploader throws', async () => {
    const uploadFile = vi.fn(async () => {
      throw new UploadMemoriesError('timeout');
    });
    const action = createUploadMemoriesAction(uploadFile);
    const files = [new File(['x'], 'room.jpg', { type: 'image/jpeg' })];

    const result = await action(createFormData(files));

    expect(result).toEqual({ success: false, errorKey: 'timeout' });
  });
});
