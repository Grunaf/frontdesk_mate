'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ModuleStatus } from '@/entities/tenant';
import { cn } from '@/shared/lib/utils';
import { AdminSectionStatusBadge } from './AdminField';

export type AdminSettingsDrillDownModule = {
  id: string;
  label: string;
  description?: string;
  hint?: string;
  status?: ModuleStatus | 'n/a';
  render: () => React.ReactNode;
};

export interface AdminSettingsDrillDownProps {
  activeModuleId: string | null;
  onModuleChange: (moduleId: string | null) => void;
  modules: AdminSettingsDrillDownModule[];
  hubFooter?: React.ReactNode;
  backLabel?: string;
  /** When `external`, detail view omits inline header (breadcrumbs live above the panel). */
  detailChrome?: 'inline' | 'external';
}

function AdminSettingsDrillDownHeader({
  title,
  backLabel,
  onBack,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b pb-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        aria-label={backLabel}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        <span className="sr-only sm:not-sr-only sm:inline">{backLabel}</span>
      </button>
      <h4 className="min-w-0 truncate text-sm font-semibold">{title}</h4>
    </div>
  );
}

export function AdminSettingsDrillDown({
  activeModuleId,
  onModuleChange,
  modules,
  hubFooter,
  backLabel = 'Back',
  detailChrome = 'inline',
}: AdminSettingsDrillDownProps) {
  const activeModule = activeModuleId
    ? modules.find((entry) => entry.id === activeModuleId)
    : undefined;

  if (activeModule) {
    return (
      <div>
        {detailChrome === 'inline' ? (
          <AdminSettingsDrillDownHeader
            title={activeModule.label}
            backLabel={backLabel}
            onBack={() => onModuleChange(null)}
          />
        ) : null}
        <div className="space-y-4">{activeModule.render()}</div>
      </div>
    );
  }

  return (
    <div className="space-y-1" role="list" aria-label="Section modules">
      {modules.map((module) => (
        <button
          key={module.id}
          type="button"
          role="listitem"
          onClick={() => onModuleChange(module.id)}
          className={cn(
            'flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60'
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{module.label}</span>
              <div className="flex shrink-0 items-center gap-1.5">
                {module.status ? <AdminSectionStatusBadge status={module.status} /> : null}
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </div>
            </div>
            {module.description ? (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {module.description}
              </p>
            ) : null}
            {module.hint ? (
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{module.hint}</p>
            ) : null}
          </div>
        </button>
      ))}
      {hubFooter ? <div className="border-t pt-4">{hubFooter}</div> : null}
    </div>
  );
}
