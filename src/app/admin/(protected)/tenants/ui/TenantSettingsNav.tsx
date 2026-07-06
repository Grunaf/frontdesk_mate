'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AdminSectionId } from '../lib/adminSections';
import {
  ADMIN_SECTIONS,
  adminTenantSettingsSectionPath,
  getAdminSectionHint,
  getAdminSectionStatus,
} from '../lib/adminSections';
import {
  formatAdminSectionGuestProgress,
  getAdminSectionGuestProgress,
} from '../lib/resolveAdminSectionProgress';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { AdminSectionStatusBadge } from './AdminField';
import { cn } from '@/shared/lib/utils';

interface TenantSettingsNavProps {
  tenantSlug: string;
  navInputLive: TenantReadinessInput;
  readinessInput: TenantReadinessInput;
  isDirty: boolean;
  onNavigate: (sectionId: AdminSectionId, href: string) => void;
  sectionFilter?: (sectionId: AdminSectionId) => boolean;
  buildSectionHref?: (sectionId: AdminSectionId) => string;
}

export function TenantSettingsNav({
  tenantSlug,
  navInputLive,
  readinessInput,
  isDirty,
  onNavigate,
  sectionFilter,
  buildSectionHref,
}: TenantSettingsNavProps) {
  const pathname = usePathname();
  const sections = sectionFilter ? ADMIN_SECTIONS.filter((s) => sectionFilter(s.id)) : ADMIN_SECTIONS;

  return (
    <nav className="space-y-1 rounded-xl border bg-background p-2" aria-label="Settings sections">
      <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sections
      </p>
      {sections.map((section) => {
        const href = buildSectionHref
          ? buildSectionHref(section.id)
          : adminTenantSettingsSectionPath(tenantSlug, section.id);
        const isActive = pathname === href || pathname.endsWith(`/settings/${section.id}`);
        const status = getAdminSectionStatus(section.id, navInputLive);
        const hint = getAdminSectionHint(section.id, navInputLive);
        const progress = getAdminSectionGuestProgress(section.id, readinessInput);
        const progressLabel = progress ? formatAdminSectionGuestProgress(progress) : null;

        return (
          <Link
            key={section.id}
            href={href}
            onClick={(event) => {
              if (isActive) {
                event.preventDefault();
                return;
              }
              if (isDirty) {
                event.preventDefault();
                onNavigate(section.id, href);
              }
            }}
            className={cn(
              'block w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60',
              isActive && 'bg-muted'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{section.label}</span>
              <div className="flex shrink-0 items-center gap-1.5">
                {progressLabel ? (
                  <span className="text-[10px] font-medium text-muted-foreground">{progressLabel}</span>
                ) : null}
                <AdminSectionStatusBadge status={status} />
              </div>
            </div>
            {hint ? (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{hint}</p>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
