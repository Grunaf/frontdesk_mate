'use client';

import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  getTenantSetupSummaries,
  type TenantReadinessInput,
  type TenantReadinessItem,
} from '@/entities/tenant/lib/resolveTenantReadiness';
import {
  resolveGuestPathGate,
  type GuestPathReadinessInput,
} from '@/entities/tenant/lib/resolveGuestPathReadiness';
import type { AdminSectionId } from '../lib/adminSections';
import { Icon } from '@/shared/ui';

interface TenantReadinessChecklistProps {
  readinessInput: TenantReadinessInput;
  guestPathInput: GuestPathReadinessInput;
  onJumpToSection: (sectionId: AdminSectionId) => void;
}

function ChecklistGroup({
  title,
  items,
  onJumpToSection,
  anchorId,
}: {
  title: string;
  items: TenantReadinessItem[];
  onJumpToSection: (sectionId: AdminSectionId) => void;
  anchorId?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div id={anchorId} className="mt-4 scroll-mt-[var(--admin-sticky-offset,5.5rem)]">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {items.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onJumpToSection(entry.sectionId as AdminSectionId)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5 text-left transition-colors hover:bg-amber-50"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {entry.label}
                  {entry.tier === 'blocker' ? (
                    <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-950">
                      Blocker
                    </span>
                  ) : null}
                </span>
                {entry.detail ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">{entry.detail}</span>
                ) : null}
              </span>
              <Icon icon={ChevronRight} className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TenantReadinessChecklist({
  readinessInput,
  guestPathInput,
  onJumpToSection,
}: TenantReadinessChecklistProps) {
  const setup = useMemo(() => getTenantSetupSummaries(readinessInput), [readinessInput]);
  const guestPathGate = useMemo(() => resolveGuestPathGate(guestPathInput), [guestPathInput]);
  const { config, modules } = setup;
  const configIncomplete = config.incompleteItems;
  const blockers = configIncomplete.filter((entry) => entry.tier === 'blocker');
  const recommended = configIncomplete.filter((entry) => entry.tier === 'recommended');
  const configComplete = configIncomplete.length === 0;
  const modulesComplete = modules.gapCount === 0;
  const fullyReady = guestPathGate.ready;

  if (config.totalCount === 0 && modules.trackedCount === 0) {
    return null;
  }

  let badge: React.ReactNode;
  if (!guestPathGate.ready) {
    badge = (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
        {guestPathGate.incompleteMust.length} guest-path must
      </span>
    );
  } else if (!configComplete) {
    badge = (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
        {configIncomplete.length} config gap{configIncomplete.length === 1 ? '' : 's'}
      </span>
    );
  } else if (!modulesComplete) {
    badge = (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
        {modules.gapCount} module gap{modules.gapCount === 1 ? '' : 's'}
      </span>
    );
  } else {
    badge = (
      <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-900">
        Ready for guests
      </span>
    );
  }

  return (
    <section
      id="tenant-readiness"
      className="mb-6 scroll-mt-[var(--admin-sticky-offset,5.5rem)] rounded-xl border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Launch checklist</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Guest path: {guestPathGate.ready ? 'ready' : `${guestPathGate.incompleteMust.length} must left`}
            {' · '}
            {config.completeCount} of {config.totalCount} full config
            {modules.trackedCount > 0
              ? ` · ${modules.liveCount} of ${modules.trackedCount} modules live`
              : ''}
          </p>
        </div>
        {badge}
      </div>

      {!guestPathGate.ready ? (
        <>
          <ChecklistGroup
            title="Guest path — must fix"
            items={guestPathGate.incompleteMust.map((item) => ({
              id: item.id,
              sectionId:
                item.stepId === 'identity'
                  ? 'identity'
                  : item.stepId === 'contacts-landing'
                    ? 'contacts'
                    : item.stepId === 'booking'
                      ? 'booking'
                      : item.stepId === 'arrival'
                        ? 'arrival'
                        : item.stepId === 'room-map' || item.stepId === 'rules-wifi'
                          ? 'guest-app'
                          : 'identity',
              label: item.label,
              tier: 'blocker' as const,
              status: 'incomplete' as const,
              detail: item.detail,
            }))}
            onJumpToSection={onJumpToSection}
          />
        </>
      ) : null}

      {!configComplete ? (
        <>
          <ChecklistGroup title="Must fix" items={blockers} onJumpToSection={onJumpToSection} />
          <ChecklistGroup title="Before go-live" items={recommended} onJumpToSection={onJumpToSection} />
        </>
      ) : fullyReady ? (
        <p className="mt-3 text-sm text-green-900">
          Guest path is ready — you can share links with guests.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Config is complete. Finish guest app modules below.
        </p>
      )}

      {modules.incompleteModules.length > 0 ? (
        <ChecklistGroup
          anchorId="tenant-modules"
          title="Guest app modules"
          items={modules.incompleteModules}
          onJumpToSection={onJumpToSection}
        />
      ) : null}
    </section>
  );
}
