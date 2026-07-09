'use client';

import type { ReactNode } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { formatDisplayDate } from '../lib/guestAccessDates';
import type { ReceptionHubSnapshot } from '../lib/resolveReceptionHubSnapshot';
import { BedInventoryGrid } from './BedInventoryGrid';
import { cn } from '@/shared/lib/utils';

interface ReceptionHubViewProps {
  snapshot: ReceptionHubSnapshot;
  resolveBedLabel: (bedId: string) => string;
  onViewStay: (stayId: string) => void;
}

function formatOperationalDayCaption(snapshot: ReceptionHubSnapshot): string {
  const { operationalDate } = snapshot.operational;
  const startLabel = snapshot.operationalDayStartTime;
  return `Operational day · ${formatDisplayDate(operationalDate)} · starts ${startLabel}`;
}

function HubArrivalList({
  stays,
  resolveBedLabel,
  onViewStay,
  emptyLabel,
}: {
  stays: GuestStayRecordWithLink[];
  resolveBedLabel: (bedId: string) => string;
  onViewStay: (stayId: string) => void;
  emptyLabel?: string;
}) {
  if (stays.length === 0) {
    return emptyLabel ? (
      <p className="text-xs text-muted-foreground">{emptyLabel}</p>
    ) : null;
  }

  return (
    <ul className="space-y-1.5">
      {stays.map((stay) => {
        const checkInDay = stay.check_in_at.slice(0, 10);
        const guestLabel = stay.guest_name?.trim() || 'Guest';
        const bedLabel = resolveBedLabel(stay.bed_id);

        return (
          <li key={stay.id}>
            <button
              type="button"
              onClick={() => onViewStay(stay.id)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-left text-sm',
                'hover:bg-muted/40'
              )}
            >
              <span className="min-w-0 truncate font-medium">{guestLabel}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {bedLabel} · {formatDisplayDate(checkInDay)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function HubSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function ReceptionHubView({
  snapshot,
  resolveBedLabel,
  onViewStay,
}: ReceptionHubViewProps) {
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">{formatOperationalDayCaption(snapshot)}</p>

      <HubSection title="Expected arrivals">
        <HubArrivalList
          stays={snapshot.expectedToday}
          resolveBedLabel={resolveBedLabel}
          onViewStay={onViewStay}
          emptyLabel="No check-ins expected for this operational day."
        />
      </HubSection>

      {snapshot.stillExpected.length > 0 ? (
        <HubSection title="Still expected">
          <HubArrivalList
            stays={snapshot.stillExpected}
            resolveBedLabel={resolveBedLabel}
            onViewStay={onViewStay}
          />
        </HubSection>
      ) : null}

      {snapshot.noShow.length > 0 ? (
        <details className="group rounded-lg border border-dashed border-muted-foreground/30 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">
            No-show ({snapshot.noShow.length})
          </summary>
          <div className="mt-2">
            <HubArrivalList
              stays={snapshot.noShow}
              resolveBedLabel={resolveBedLabel}
              onViewStay={onViewStay}
            />
          </div>
        </details>
      ) : null}

      <HubSection title="Free beds">
        {snapshot.freeBedRoomGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground">No free beds for this operational night.</p>
        ) : (
          <BedInventoryGrid
            compact
            roomGroups={snapshot.freeBedRoomGroups}
            onViewOccupiedStay={onViewStay}
          />
        )}
      </HubSection>

      {snapshot.orphanStays.length > 0 ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {snapshot.orphanStays.length} access record(s) on unknown beds — fix the room map in admin.
        </p>
      ) : null}
    </div>
  );
}
