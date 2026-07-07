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
  /** When set, row shows a guest-offer toggle; drill-in only while offered. */
  hubOffered?: boolean;
  onHubOfferedChange?: (offered: boolean) => void;
  hubOfferedAriaLabel?: string;
  render: () => React.ReactNode;
};

export type AdminSettingsDrillDownGroup = {
  title?: string;
  modules: AdminSettingsDrillDownModule[];
};

export interface AdminSettingsDrillDownProps {
  activeModuleId: string | null;
  onModuleChange: (moduleId: string | null) => void;
  modules: AdminSettingsDrillDownModule[];
  /** When set, hub list is rendered in sections; modules are flattened for lookup. */
  groups?: AdminSettingsDrillDownGroup[];
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

function AdminSettingsDrillDownModuleRowBody({
  module,
}: {
  module: AdminSettingsDrillDownModule;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{module.label}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {module.status ? <AdminSectionStatusBadge status={module.status} /> : null}
          {module.hubOffered !== false ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          ) : null}
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
  );
}

function AdminSettingsDrillDownModuleRow({
  module,
  onSelect,
}: {
  module: AdminSettingsDrillDownModule;
  onSelect: (moduleId: string) => void;
}) {
  const hasOfferToggle = module.onHubOfferedChange !== undefined;
  const offered = !hasOfferToggle || module.hubOffered === true;
  const rowChrome = cn(
    'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
    offered && 'hover:bg-muted/60'
  );

  return (
    <div role="listitem" className={rowChrome}>
      {hasOfferToggle ? (
        <button
          type="button"
          role="switch"
          aria-checked={module.hubOffered === true}
          title="Offer this hub to guests"
          aria-label={
            module.hubOfferedAriaLabel ?? `Offer ${module.label} to guests on arrival`
          }
          onClick={() => module.onHubOfferedChange?.(!(module.hubOffered === true))}
          className={cn(
            'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full border border-transparent transition-colors',
            module.hubOffered === true ? 'bg-primary' : 'bg-muted'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none block size-4 translate-y-0.5 rounded-full bg-background shadow-sm transition-transform',
              module.hubOffered === true ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
      ) : null}
      {offered ? (
        <button
          type="button"
          onClick={() => onSelect(module.id)}
          className="min-w-0 flex-1 text-left"
        >
          <AdminSettingsDrillDownModuleRowBody module={module} />
        </button>
      ) : (
        <div className="min-w-0 flex-1 opacity-70">
          <AdminSettingsDrillDownModuleRowBody module={module} />
        </div>
      )}
    </div>
  );
}

export function AdminSettingsDrillDown({
  activeModuleId,
  onModuleChange,
  modules,
  groups,
  hubFooter,
  backLabel = 'Back',
  detailChrome = 'inline',
}: AdminSettingsDrillDownProps) {
  const flatModules = groups ? groups.flatMap((group) => group.modules) : modules;
  const activeModule = activeModuleId
    ? flatModules.find((entry) => entry.id === activeModuleId)
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

  const hubGroups = groups ?? [{ modules }];

  return (
    <div className="space-y-3" role="list" aria-label="Section modules">
      {hubGroups.map((group, groupIndex) => (
        <div key={group.title ?? `group-${groupIndex}`} className="space-y-1">
          {group.title ? (
            <p className="px-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.title}
            </p>
          ) : null}
          {group.modules.map((module) => (
            <AdminSettingsDrillDownModuleRow
              key={module.id}
              module={module}
              onSelect={onModuleChange}
            />
          ))}
        </div>
      ))}
      {hubFooter ? <div className="border-t pt-4">{hubFooter}</div> : null}
    </div>
  );
}
