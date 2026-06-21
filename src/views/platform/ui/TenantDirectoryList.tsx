'use client';

import { getTenantPublicUrl, type TenantPublicSite } from '@/shared/config';

export interface TenantDirectoryEntry {
  slug: string;
  name: string;
}

interface TenantDirectoryListProps {
  title: string;
  tenants: TenantDirectoryEntry[];
  site: TenantPublicSite;
  locale: string;
  excludeSlug?: string;
}

export function TenantDirectoryList({
  title,
  tenants,
  site,
  locale,
  excludeSlug,
}: TenantDirectoryListProps) {
  const visibleTenants = excludeSlug
    ? tenants.filter((tenant) => tenant.slug !== excludeSlug)
    : tenants;

  if (visibleTenants.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-3 text-left">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <ul className="space-y-2">
        {visibleTenants.map((tenant) => (
          <li key={tenant.slug}>
            <a
              href={getTenantPublicUrl(tenant.slug, site, locale)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
            >
              <span className="font-medium text-foreground">{tenant.name}</span>
              <span className="text-xs text-muted-foreground">{tenant.slug}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
