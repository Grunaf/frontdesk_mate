export type UploadMemoriesErrorKey = 'noFiles' | 'uploadFailed' | 'timeout' | 'unknown';

export interface UploadMemoriesResult {
  success: boolean;
  errorKey?: UploadMemoriesErrorKey;
}

export class UploadMemoriesError extends Error {
  constructor(public readonly errorKey: UploadMemoriesErrorKey) {
    super(errorKey);
    this.name = 'UploadMemoriesError';
  }
}
