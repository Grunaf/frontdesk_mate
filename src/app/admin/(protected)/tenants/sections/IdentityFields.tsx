'use client';

import { useEffect, useState } from 'react';
import type { CityPackContent, CityPackGateSnapshot, CityPackSelectOption } from '@/entities/city-pack';
import {
  isCityPackReadyForTenant,
  resolveCityPackNotReadyReasonForTenant,
} from '@/entities/city-pack/lib/resolveCityPackGateForTenant';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import { TenantBrand } from '@/entities/tenant/ui/TenantBrand';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { normalizeTenantSlugInput } from '@/shared/config';
import { cn } from '@/shared/lib/utils';
import { AdminField } from '../ui/AdminField';
import { CityPackInheritanceCard } from '../ui/CityPackInheritanceCard';

interface IdentityFieldsProps {
  slug: string;
  originalSlug: string;
  name: string;
  cityPackId: CityPackId;
  cityPackOptions: CityPackSelectOption[];
  cityPackGateSnapshot: CityPackGateSnapshot;
  cityPackContent?: CityPackContent;
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
  onChange: (next: { slug: string; name: string; cityPackId: CityPackId }) => void;
}

export function IdentityFields({
  slug,
  originalSlug,
  name,
  cityPackId,
  cityPackOptions,
  cityPackGateSnapshot,
  cityPackContent,
  settings,
  readinessInput,
  onChange,
}: IdentityFieldsProps) {
  const [logoUrlPreview, setLogoUrlPreview] = useState(settings?.logoUrl ?? '');
  useEffect(() => {
    setLogoUrlPreview(settings?.logoUrl ?? '');
  }, [settings?.logoUrl]);
  const slugChanged = Boolean(originalSlug) && normalizeTenantSlugInput(slug) !== normalizeTenantSlugInput(originalSlug);
  const missingSlug = isTenantFieldMissing('slug', readinessInput);
  const missingName = isTenantFieldMissing('name', readinessInput);
  const packReady = isCityPackReadyForTenant(cityPackId, cityPackGateSnapshot);
  const packNotReadyReason = resolveCityPackNotReadyReasonForTenant(cityPackId, cityPackGateSnapshot);
  const selectedPackLabel = cityPackOptions.find((pack) => pack.id === cityPackId)?.label;
  const previewLogoUrl = logoUrlPreview.trim() || undefined;

  return (
    <div className="space-y-4">
      {slugChanged ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Slug change renames this tenant. Production URLs move to{' '}
          <code className="text-xs">{slug || 'new-slug'}.yourdomain.com</code>. No duplicate tenant will
          be created.
        </p>
      ) : null}
      <label className="block space-y-1.5">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          Slug
          {missingSlug ? <span className="text-xs font-normal text-amber-700">Required for guests</span> : null}
        </span>
        <span className="block text-xs text-muted-foreground">
          Used in production URLs: <code className="text-xs">{slug}.yourdomain.com</code> and{' '}
          <code className="text-xs">{slug}.app.yourdomain.com</code>. For local dev, set{' '}
          <code className="text-xs">NEXT_PUBLIC_TENANT_SLUG</code> or use{' '}
          <code className="text-xs">{slug}.localhost</code>.
        </span>
        <input
          value={slug}
          onChange={(event) => onChange({ slug: event.target.value, name, cityPackId })}
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm',
            missingSlug && 'border-amber-400 ring-1 ring-amber-200'
          )}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          Display name
          {missingName ? <span className="text-xs font-normal text-amber-700">Required for guests</span> : null}
        </span>
        <input
          value={name}
          onChange={(event) => onChange({ slug, name: event.target.value, cityPackId })}
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm',
            missingName && 'border-amber-400 ring-1 ring-amber-200'
          )}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">City pack</span>
        <span className="block text-xs text-muted-foreground">
          Routes, local guide, and default taxi for this city. Only Ready packs appear here — manage content in{' '}
          <a href="/admin/city-packs" className="underline">
            City packs
          </a>
          .
        </span>
        <select
          value={cityPackId}
          onChange={(event) =>
            onChange({ slug, name, cityPackId: event.target.value as CityPackId })
          }
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {cityPackOptions.map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.label} · {pack.placesCount} places
            </option>
          ))}
        </select>
        {!packReady ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Local guide not ready: {packNotReadyReason ?? 'City pack is not ready for tenants.'}{' '}
            <a href={`/admin/city-packs/${cityPackId}`} className="font-semibold underline">
              Edit city pack →
            </a>
          </p>
        ) : null}
        <CityPackInheritanceCard
          cityPackId={cityPackId}
          cityPackLabel={selectedPackLabel}
          cityPackGateSnapshot={cityPackGateSnapshot}
          cityPackContent={cityPackContent}
        />
      </label>
      <AdminField
        label="Logo URL"
        name="logoUrl"
        value={logoUrlPreview}
        onChange={setLogoUrlPreview}
        placeholder="/images/your-hostel/logo.png"
        hint="Shown on landing header. App uses the same logo or display name, plus an APP badge."
      />
      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brand preview</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Landing</span>
            <TenantBrand surface="landing" name={name || 'Hostel'} logoUrl={previewLogoUrl} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">App</span>
            <TenantBrand surface="app" name={name || 'Hostel'} logoUrl={previewLogoUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}
