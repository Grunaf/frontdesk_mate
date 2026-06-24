'use client';

import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Check, Circle, ExternalLink } from 'lucide-react';
import {
  getAdminGuestUrlHint,
  isTenantAppAccessibleFromStatus,
  isTenantLandingAccessibleFromStatus,
  type TenantLifecycleStatus,
} from '@/entities/tenant/lib/resolveTenantLifecycle';
import { resolveGuestAppModules } from '@/entities/tenant/lib/resolveGuestAppModules';
import {
  resolveTenantChecklistItems,
  type TenantReadinessInput,
  type TenantReadinessItem,
} from '@/entities/tenant/lib/resolveTenantReadiness';
import {
  resolveGuestPathGate,
  type GuestPathReadinessInput,
} from '@/entities/tenant/lib/resolveGuestPathReadiness';
import { getTenantPublicUrl } from '@/shared/config/tenant-urls';
import type { AdminTenantMode } from '../launch/adminTenantMode';
import { cn } from '@/shared/lib/utils';
import { Icon, Popover, PopoverContent, PopoverTrigger } from '@/shared/ui';

const STATUS_LABELS: Record<TenantLifecycleStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  archived: 'Archived',
  scheduled: 'Scheduled',
};

const STATUS_CLASSES: Record<TenantLifecycleStatus, string> = {
  active: 'bg-green-100 text-green-900',
  expired: 'bg-amber-100 text-amber-900',
  archived: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-900',
};

const MODULE_STATUS_LABELS = {
  ready: 'Live',
  preview: 'Partial',
  hidden: 'Off',
} as const;

export function formatSubscriptionDateRange(start: string, end: string): string {
  const format = (value: string) => {
    if (!value) return null;
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const startLabel = format(start);
  const endLabel = format(end);

  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
  if (startLabel) return `From ${startLabel}`;
  if (endLabel) return `Until ${endLabel}`;
  return 'Set subscription dates';
}

interface TenantCommandBarProps {
  barRef?: React.RefObject<HTMLDivElement | null>;
  displayName: string;
  slug: string;
  lifecycleStatus: TenantLifecycleStatus;
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
  archived: boolean;
  isNewTenant: boolean;
  readinessInput: TenantReadinessInput;
  configComplete: number;
  configTotal: number;
  modulesLive: number;
  modulesTracked: number;
  moduleGaps: number;
  guestPathInput: GuestPathReadinessInput;
  adminMode: AdminTenantMode;
  onAdminModeChange: (mode: AdminTenantMode) => void;
  onEditSubscription: () => void;
  onScrollToChecklist: () => void;
  onJumpToGuestModules: () => void;
  onArchiveToggle: () => void;
  isDirty?: boolean;
}

function SetupMetricPopover({
  label,
  title,
  hasGaps,
  tooltip,
  actionLabel,
  onAction,
  children,
}: {
  label: string;
  title: string;
  hasGaps: boolean;
  tooltip: string;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const handleAction = () => {
    setOpen(false);
    onAction();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={tooltip}
          aria-label={`${title}. ${tooltip}`}
          className={cn(
            'rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60',
            hasGaps ? 'border-amber-300/80 text-amber-900' : 'text-muted-foreground'
          )}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3 p-3">
        <p className="text-sm font-medium">{title}</p>
        <div className="max-h-56 space-y-1 overflow-y-auto">{children}</div>
        <button
          type="button"
          onClick={handleAction}
          className="w-full rounded-md border border-primary/20 px-2.5 py-1.5 text-left text-xs font-semibold text-primary hover:bg-primary/5"
        >
          {actionLabel}
        </button>
      </PopoverContent>
    </Popover>
  );
}

function ConfigPopoverItem({ item }: { item: TenantReadinessItem }) {
  const complete = item.status === 'complete';

  return (
    <div className="flex items-start gap-2 rounded-md px-1 py-1.5">
      <Icon
        icon={complete ? Check : Circle}
        className={cn('mt-0.5 size-3.5 shrink-0', complete ? 'text-green-700' : 'text-amber-700')}
      />
      <span className="min-w-0">
        <span className="block text-xs font-medium leading-snug">{item.label}</span>
        {!complete && item.detail ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{item.detail}</span>
        ) : null}
      </span>
    </div>
  );
}

export function TenantCommandBar({
  barRef,
  displayName,
  slug,
  lifecycleStatus,
  subscriptionStartsAt,
  subscriptionEndsAt,
  archived,
  isNewTenant,
  readinessInput,
  configComplete,
  configTotal,
  modulesLive,
  modulesTracked,
  moduleGaps,
  guestPathInput,
  adminMode,
  onAdminModeChange,
  onEditSubscription,
  onScrollToChecklist,
  onJumpToGuestModules,
  onArchiveToggle,
  isDirty = false,
}: TenantCommandBarProps) {
  const configGaps = configTotal - configComplete;
  const guestPathGate = useMemo(() => resolveGuestPathGate(guestPathInput), [guestPathInput]);
  const configItems = useMemo(
    () => resolveTenantChecklistItems(readinessInput),
    [readinessInput]
  );
  const guestModules = useMemo(
    () =>
      resolveGuestAppModules({
        cityPackId: readinessInput.cityPackId,
        settings: readinessInput.settings,
      }).filter((module) => module.status !== 'hidden'),
    [readinessInput]
  );
  const configTooltip =
    configGaps > 0
      ? `${configGaps} config item${configGaps === 1 ? '' : 's'} incomplete — click for details`
      : 'All config items complete — click for details';
  const modulesTooltip =
    moduleGaps > 0
      ? `${moduleGaps} module${moduleGaps === 1 ? '' : 's'} not live — click for details`
      : 'All tracked modules live — click for details';

  const trimmedSlug = slug.trim();
  const isAppLive = isTenantAppAccessibleFromStatus(lifecycleStatus);
  const isLandingLive = isTenantLandingAccessibleFromStatus(lifecycleStatus);
  const guestUrlHint = getAdminGuestUrlHint(lifecycleStatus);
  const landingUrl = trimmedSlug ? getTenantPublicUrl(trimmedSlug, 'landing', 'en') : null;
  const appUrl = trimmedSlug ? getTenantPublicUrl(trimmedSlug, 'app', 'en') : null;
  const title = displayName.trim() || trimmedSlug || 'New tenant';
  const dateRange = formatSubscriptionDateRange(subscriptionStartsAt, subscriptionEndsAt);
  const canArchive = Boolean(trimmedSlug) && !isNewTenant;

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-20 -mx-1 mb-6 space-y-2.5 rounded-xl border bg-background/95 px-3 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
              STATUS_CLASSES[lifecycleStatus]
            )}
          >
            {STATUS_LABELS[lifecycleStatus]}
          </span>
          <p className="truncate text-sm font-medium">{title}</p>
          {trimmedSlug && displayName.trim() ? (
            <span className="hidden text-xs text-muted-foreground sm:inline">· {trimmedSlug}</span>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => onAdminModeChange('launch')}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium',
                adminMode === 'launch'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Launch setup
            </button>
            <button
              type="button"
              onClick={() => onAdminModeChange('advanced')}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium',
                adminMode === 'advanced'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All settings
            </button>
          </div>

          <span
            className={cn(
              'hidden rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide sm:inline-flex',
              guestPathGate.ready ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'
            )}
          >
            {guestPathGate.ready ? 'Ready for guests' : `Guest path · ${guestPathGate.incompleteMust.length} must`}
          </span>

          {configTotal > 0 ? (
            <SetupMetricPopover
              label={`Config · ${configComplete}/${configTotal}`}
              title="Launch config"
              hasGaps={configGaps > 0}
              tooltip={configTooltip}
              actionLabel="Open launch checklist"
              onAction={onScrollToChecklist}
            >
              {configItems.map((item) => (
                <ConfigPopoverItem key={item.id} item={item} />
              ))}
            </SetupMetricPopover>
          ) : null}
          {modulesTracked > 0 ? (
            <SetupMetricPopover
              label={`Modules · ${modulesLive}/${modulesTracked}`}
              title="Guest app modules"
              hasGaps={moduleGaps > 0}
              tooltip={modulesTooltip}
              actionLabel="Open guest app modules"
              onAction={onJumpToGuestModules}
            >
              {guestModules.map((module) => (
                <div key={module.id} className="flex items-start justify-between gap-2 rounded-md px-1 py-1.5">
                  <span className="min-w-0">
                    <span className="block text-xs font-medium leading-snug">{module.label}</span>
                    {module.detail ? (
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                        {module.detail}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                      module.status === 'ready'
                        ? 'bg-green-100 text-green-900'
                        : 'bg-amber-100 text-amber-900'
                    )}
                  >
                    {MODULE_STATUS_LABELS[module.status]}
                  </span>
                </div>
              ))}
            </SetupMetricPopover>
          ) : null}

          {canArchive ? (
            <button
              type="button"
              onClick={onArchiveToggle}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium',
                archived
                  ? 'border-primary/30 text-primary hover:bg-primary/5'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-destructive'
              )}
            >
              <Icon icon={archived ? ArchiveRestore : Archive} className="size-3.5" />
              {archived ? 'Restore' : 'Archive'}
            </button>
          ) : null}

          <button
            type="submit"
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium text-primary-foreground sm:px-5',
              isDirty ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary'
            )}
          >
            {isDirty ? 'Save changes · unsaved' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/60 pt-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={onEditSubscription}
            className="text-xs font-medium text-primary hover:underline"
          >
            {dateRange}
          </button>
          {guestUrlHint && trimmedSlug ? (
            <span className="text-[11px] text-amber-800">{guestUrlHint}</span>
          ) : null}
        </div>

        {trimmedSlug ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex flex-wrap gap-3 text-xs">
              <GuestUrlLink label="Landing" href={landingUrl!} offline={!isLandingLive} />
              <GuestUrlLink label="Guest app" href={appUrl!} offline={!isAppLive} />
            </div>
            <p className="text-[10px] text-muted-foreground">Links open English preview</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Set slug in Identity for guest URLs</p>
        )}
      </div>
    </div>
  );
}

function GuestUrlLink({
  label,
  href,
  offline,
}: {
  label: string;
  href: string;
  offline: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 hover:underline',
        offline ? 'text-amber-800' : 'text-foreground'
      )}
    >
      <span className="font-medium">{label}</span>
      <Icon icon={ExternalLink} className="size-3 shrink-0" />
    </a>
  );
}
