'use client';

import { ImageIcon, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  isTenantSlugForAssetPath,
  uploadTenantAssetAction,
  type TenantAssetKind,
} from '@/features/admin-asset-upload';
import { normalizeTenantSlugInput } from '@/shared/config';
import { cn } from '@/shared/lib/utils';

const UPLOAD_ERROR_LABELS: Record<string, string> = {
  notConfigured: 'Image storage is not configured on this environment.',
  invalidSlug: 'Set a valid tenant slug before uploading.',
  invalidKind: 'Upload type is invalid.',
  invalidFile: 'Use a PNG, JPG, WebP, GIF, or SVG under 5 MB.',
  uploadFailed: 'Upload failed. Try again or paste an image URL.',
};

type AdminImageFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  tenantSlug: string;
  kind: TenantAssetKind;
  hint?: string;
  placeholder?: string;
  missing?: boolean;
  previewAlt?: string;
};

export function AdminImageField({
  label,
  value,
  onChange,
  tenantSlug,
  kind,
  hint,
  placeholder = 'https://… or /images/…',
  missing = false,
  previewAlt = '',
}: AdminImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);

  const trimmed = value.trim();
  const slugForUpload = normalizeTenantSlugInput(tenantSlug);
  const showImage = Boolean(trimmed) && !previewBroken;

  const openFilePicker = () => {
    if (!pending) {
      fileInputRef.current?.click();
    }
  };

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setPreviewBroken(false);

    if (!isTenantSlugForAssetPath(slugForUpload)) {
      setUploadError(UPLOAD_ERROR_LABELS.invalidSlug);
      return;
    }

    setPending(true);
    const formData = new FormData();
    formData.set('slug', slugForUpload);
    formData.set('kind', kind);
    formData.set('file', file);

    const result = await uploadTenantAssetAction(formData);
    setPending(false);

    if (!result.ok) {
      setUploadError(UPLOAD_ERROR_LABELS[result.error] ?? UPLOAD_ERROR_LABELS.uploadFailed);
      return;
    }

    onChange(result.publicUrl);
  };

  const blockClassName = cn(
    'relative flex h-40 w-full overflow-hidden rounded-lg border bg-muted/20',
    missing && 'border-amber-400 ring-1 ring-amber-200'
  );

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {label}
          {missing ? <span className="text-xs font-normal text-amber-700">Required for guests</span> : null}
        </span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              void handleUpload(file);
            }
          }}
        />

        <div className={blockClassName}>
          {showImage ? (
            <>
              <img
                src={trimmed}
                alt={previewAlt || label}
                className="h-full w-full object-cover object-center"
                onLoad={() => setPreviewBroken(false)}
                onError={() => setPreviewBroken(true)}
              />
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={openFilePicker}
                  className="rounded-md border border-white/30 bg-black/40 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/55 disabled:opacity-50"
                >
                  {pending ? 'Uploading…' : 'Replace'}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setPreviewBroken(false);
                    onChange('');
                  }}
                  className="rounded-md border border-white/30 bg-black/40 px-2.5 py-1 text-xs font-medium text-white hover:bg-black/55 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={openFilePicker}
              className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
              ) : (
                <ImageIcon className="h-8 w-8 opacity-50" aria-hidden />
              )}
              <span className="text-sm font-medium text-foreground">
                {pending ? 'Uploading…' : 'No image yet'}
              </span>
              <span className="text-xs">
                {trimmed && previewBroken
                  ? 'Preview failed — click to upload or fix the URL below'
                  : 'Click to upload, or paste a URL below'}
              </span>
            </button>
          )}

          {pending && showImage ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : null}
        </div>

        <input
          type="text"
          value={value}
          onChange={(event) => {
            setUploadError(null);
            setPreviewBroken(false);
            onChange(event.target.value);
          }}
          placeholder={placeholder}
          aria-label={`${label} URL`}
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm',
            missing && !trimmed && 'border-amber-400 ring-1 ring-amber-200'
          )}
        />
      </div>
      {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
    </div>
  );
}
