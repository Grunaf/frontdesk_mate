import { supabase } from '@/shared/lib/db';
import { UploadMemoriesError, type UploadMemoriesResult } from './types';

const UPLOAD_TIMEOUT_MS = 30_000;
type UploadError = { message: string } | null;
type UploadFileFn = (filePath: string, file: File) => Promise<{ error: UploadError }>;

function validateServerData(filesLength: number) {
  if (filesLength === 0) {
    throw new UploadMemoriesError('noFiles');
  }
}

export function chooseFilePath(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  const folder = isVideo ? 'videos' : isImage ? 'image' : 'others';
  return `${folder}/${fileName}`;
}

async function uploadWithTimeout(filePath: string, file: File): Promise<{ error: UploadError }> {
  const uploadPromise = supabase.storage.from('memories').upload(filePath, file);
  const timeoutPromise = new Promise<{ error: UploadError }>((_, reject) => {
    setTimeout(() => reject(new UploadMemoriesError('timeout')), UPLOAD_TIMEOUT_MS);
  });

  return Promise.race([uploadPromise, timeoutPromise]);
}

export function createUploadMemoriesAction(uploadFile: UploadFileFn) {
  return async function uploadMemoriesAction(formData: FormData): Promise<UploadMemoriesResult> {
    try {
      const files = formData.getAll('files') as File[];
      validateServerData(files.length);

      await Promise.all(
        files.map(async (file) => {
          const filePath = chooseFilePath(file);
          const { error } = await uploadFile(filePath, file);

          if (error) {
            throw new UploadMemoriesError('uploadFailed');
          }
        })
      );

      return { success: true };
    } catch (error: unknown) {
      console.error('Server Action Error:', error);

      if (error instanceof UploadMemoriesError) {
        return { success: false, errorKey: error.errorKey };
      }

      return { success: false, errorKey: 'unknown' };
    }
  };
}

const uploadFileToSupabase: UploadFileFn = (filePath, file) => uploadWithTimeout(filePath, file);

export const executeUploadMemories = createUploadMemoriesAction(uploadFileToSupabase);
