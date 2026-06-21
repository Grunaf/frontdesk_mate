'use server';

import { executeUploadMemories } from './uploadMemoriesCore';
import type { UploadMemoriesResult } from './types';

export async function uploadMemoriesAction(formData: FormData): Promise<UploadMemoriesResult> {
  return executeUploadMemories(formData);
}
