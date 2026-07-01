'use client';

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

  const trimmed = value.trim();
  const slugForUpload = normalizeTenantSlugInput(tenantSlug);

  const handleUpload = async (file: File) => {
    setUploadError(null);

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

  return (
    <div className="space-y-2">
      <label className="block space-y-1.5">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {label}
          {missing ? <span className="text-xs font-normal text-amber-700">Required for guests</span> : null}
        </span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
          >
            {pending ? 'Uploading…' : 'Upload image'}
          </button>
          {trimmed ? (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onChange('')}
            >
              Clear
            </button>
          ) : null}
        </div>
        <input
          type="text"
          value={value}
          onChange={(event) => {
            setUploadError(null);
            onChange(event.target.value);
          }}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm',
            missing && 'border-amber-400 ring-1 ring-amber-200'
          )}
        />
      </label>
      {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
      {trimmed ? (
        <div className="overflow-hidden rounded-lg border bg-muted/20">
          <img src={trimmed} alt={previewAlt} className="max-h-40 w-full object-cover object-center" />
        </div>
      ) : null}
    </div>
  );
}
