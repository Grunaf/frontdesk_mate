'use client';

import { useMemo } from 'react';
import type { CityPackGateSnapshot } from '@/entities/city-pack';
import type { CityPackId } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant';
import { resolveGuestAppModules } from '@/entities/tenant/lib/resolveGuestAppModules';
import type { AdminSectionId } from '../lib/adminSections';
import { AdminSectionStatusBadge } from './AdminField';

interface AdminModuleStatusPanelProps {
  cityPackId: CityPackId;
  cityPackGateSnapshot?: CityPackGateSnapshot;
  settings?: TenantSettings;
  onJumpToSection?: (sectionId: AdminSectionId) => void;
}

export function AdminModuleStatusPanel({
  cityPackId,
  cityPackGateSnapshot,
  settings,
  onJumpToSection,
}: AdminModuleStatusPanelProps) {
  const modules = useMemo(
    () => resolveGuestAppModules({ cityPackId, settings: settings ?? {}, cityPackGateSnapshot }),
    [cityPackId, settings, cityPackGateSnapshot]
  );

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Module status
      </p>
      <ul className="space-y-2">
        {modules.map((module) => (
          <li
            key={module.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-md border bg-background px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{module.label}</span>
                <AdminSectionStatusBadge status={module.status} />
              </div>
              {module.detail ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{module.detail}</p>
              ) : null}
              {module.actionSectionId && onJumpToSection ? (
                <button
                  type="button"
                  onClick={() => onJumpToSection(module.actionSectionId!)}
                  className="mt-1 text-xs font-semibold text-primary hover:underline"
                >
                  Go to Identity
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
