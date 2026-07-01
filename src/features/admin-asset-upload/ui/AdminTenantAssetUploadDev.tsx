'use client';

import { useState } from 'react';
import { uploadTenantAssetAction } from '../api/uploadTenantAssetAction';
import type { TenantAssetKind } from '../model/types';

type Props = {
  slug: string;
  kind?: TenantAssetKind;
};

/**
 * Temporary dev helper — wire on an admin page to smoke-test storage upload.
 * Not used in tenant form (Chat 1).
 */
export function AdminTenantAssetUploadDev({ slug, kind = 'misc' }: Props) {
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-2 rounded border border-dashed border-neutral-400 p-3 text-sm">
      <p className="font-medium">Dev: tenant asset upload</p>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setPublicUrl(null);
          setPending(true);

          const form = event.currentTarget;
          const formData = new FormData(form);
          formData.set('slug', slug);
          formData.set('kind', kind);

          const result = await uploadTenantAssetAction(formData);
          setPending(false);

          if (!result.ok) {
            setError(result.error);
            return;
          }

          setPublicUrl(result.publicUrl);
        }}
      >
        <input name="file" type="file" accept="image/png,image/*" required />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-neutral-900 px-3 py-1 text-white disabled:opacity-50"
        >
          {pending ? 'Uploading…' : 'Upload PNG'}
        </button>
      </form>
      {error ? <p className="text-red-600">Error: {error}</p> : null}
      {publicUrl ? (
        <p>
          URL:{' '}
          <a className="break-all text-blue-600 underline" href={publicUrl} rel="noreferrer" target="_blank">
            {publicUrl}
          </a>
        </p>
      ) : null}
    </div>
  );
}
