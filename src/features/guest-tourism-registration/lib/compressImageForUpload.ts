const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_LONG_EDGE = 1600;
const TARGET_BYTES = 500 * 1024;
const INITIAL_QUALITY = 0.8;
const MIN_QUALITY = 0.45;
const QUALITY_STEP = 0.08;

export type CompressImageForUploadErrorCode =
  | 'file_too_large'
  | 'not_an_image'
  | 'processing_failed';

export class CompressImageForUploadError extends Error {
  readonly code: CompressImageForUploadErrorCode;

  constructor(code: CompressImageForUploadErrorCode) {
    super(code);
    this.name = 'CompressImageForUploadError';
    this.code = code;
  }
}

function isHeicFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.heic') || lower.endsWith('.heif');
}

function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) {
    return true;
  }
  return isHeicFileName(file.name);
}

function pickOutputMimeType(): 'image/webp' | 'image/jpeg' {
  if (typeof document === 'undefined') {
    return 'image/jpeg';
  }
  const canvas = document.createElement('canvas');
  const data = canvas.toDataURL('image/webp');
  return data.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode_failed'));
    };
    image.src = url;
  });
}

function scaleToMaxLongEdge(width: number, height: number): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_LONG_EDGE) {
    return { width, height };
  }
  const scale = MAX_LONG_EDGE / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('blob_failed'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

function extensionForMime(mimeType: string): string {
  return mimeType === 'image/webp' ? 'webp' : 'jpg';
}

/**
 * Client-side resize/compress for tourism document uploads.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new CompressImageForUploadError('file_too_large');
  }

  if (!isLikelyImageFile(file)) {
    throw new CompressImageForUploadError('not_an_image');
  }

  if (typeof document === 'undefined') {
    throw new CompressImageForUploadError('processing_failed');
  }

  let image: HTMLImageElement;
  try {
    image = await loadImageFromFile(file);
  } catch {
    throw new CompressImageForUploadError('processing_failed');
  }

  const { width, height } = scaleToMaxLongEdge(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new CompressImageForUploadError('processing_failed');
  }

  context.drawImage(image, 0, 0, width, height);

  const mimeType = pickOutputMimeType();
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'document';
  const ext = extensionForMime(mimeType);

  let quality = INITIAL_QUALITY;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  while (blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  return new File([blob], `${baseName}.${ext}`, { type: mimeType, lastModified: Date.now() });
}
