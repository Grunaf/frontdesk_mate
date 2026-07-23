'use client';

import type { ReactNode } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { stayRecordCheckInDate } from '@/entities/guest-stay';
import { formatDisplayDate } from '../lib/guestAccessDates';
import type { DepartureSectionPhase } from '../lib/resolveDepartureSectionPhase';
import type { ReceptionHubSnapshot } from '../lib/resolveReceptionHubSnapshot';
import { cn } from '@/shared/lib/utils';

interface ReceptionHubViewProps {
  snapshot: ReceptionHubSnapshot;
  resolveBedLabel: (bedId: string) => string;
  onViewStay: (stayId: string) => void;
  onOpenFreeBeds?: () => void;
  operationalDayUpdatedNotice?: boolean;
  /** When set, Payment due becomes a compact callout into Cash. */
  paymentDueCallout?: {
    unpaidCount: number;
    stillDueLabel: string;
    onOpenCash: () => void;
  } | null;
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
  resolveSecondary,
}: {
  stays: GuestStayRecordWithLink[];
  resolveBedLabel: (bedId: string) => string;
  onViewStay: (stayId: string) => void;
  emptyLabel?: string;
  resolveSecondary?: (stay: GuestStayRecordWithLink, bedLabel: string) => string;
}) {
  if (stays.length === 0) {
    return emptyLabel ? (
      <p className="text-xs text-muted-foreground">{emptyLabel}</p>
    ) : null;
  }

  return (
    <ul className="space-y-1.5">
      {stays.map((stay) => {
        const checkInDay = stayRecordCheckInDate(stay);
        const guestLabel = stay.guest_name?.trim() || 'Guest';
        const bedLabel = resolveBedLabel(stay.bed_id);
        const secondary =
          resolveSecondary?.(stay, bedLabel) ?? `${bedLabel} · ${formatDisplayDate(checkInDay)}`;

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
              <span className="shrink-0 text-xs text-muted-foreground">{secondary}</span>
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

function OccupancyStatBlock({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        {content}
      </button>
    );
  }

  return <div className="rounded-lg border bg-card px-3 py-2.5">{content}</div>;
}

function departureSectionTitle(phase: DepartureSectionPhase, count: number): string {
  if (phase === 'ahead') return 'Departures today';
  return `Departures today (${count})`;
}

function DeparturesSection({
  snapshot,
  resolveBedLabel,
  onViewStay,
}: {
  snapshot: ReceptionHubSnapshot;
  resolveBedLabel: (bedId: string) => string;
  onViewStay: (stayId: string) => void;
}) {
  const { departures, departurePhase, checkOutTimeLabel } = snapshot;
  if (departures.length === 0) return null;

  const title = departureSectionTitle(departurePhase, departures.length);
  const list = (
    <HubArrivalList
      stays={departures}
      resolveBedLabel={resolveBedLabel}
      onViewStay={onViewStay}
      resolveSecondary={(_stay, bedLabel) =>
        checkOutTimeLabel ? `${bedLabel} · by ${checkOutTimeLabel}` : bedLabel
      }
    />
  );

  if (departurePhase === 'ahead') {
    return <HubSection title={title}>{list}</HubSection>;
  }

  if (departurePhase === 'due_soon') {
    return (
      <section
        className={cn(
          'space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5',
          'text-amber-950'
        )}
      >
        <h3 className="text-xs font-medium uppercase tracking-wide text-amber-900/80">{title}</h3>
        {list}
      </section>
    );
  }

  return (
    <section
      className={cn(
        'space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5'
      )}
    >
      <h3 className="text-xs font-medium uppercase tracking-wide text-destructive">{title}</h3>
      <p className="text-xs text-destructive/90">
        Past check-out — confirm guests have left.
      </p>
      {list}
    </section>
  );
}

export function ReceptionHubView({
  snapshot,
  resolveBedLabel,
  onViewStay,
  onOpenFreeBeds,
  operationalDayUpdatedNotice = false,
  paymentDueCallout = null,
}: ReceptionHubViewProps) {
  return (
    <div className="space-y-5">
      {operationalDayUpdatedNotice ? (
        <p
          role="status"
          className="rounded-md border border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
        >
          Operational day updated
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">{formatOperationalDayCaption(snapshot)}</p>

      <div className="grid grid-cols-2 gap-2">
        <OccupancyStatBlock
          label="Free"
          value={snapshot.freeBedEntries.length}
          onClick={onOpenFreeBeds}
        />
        <OccupancyStatBlock label="Occupied" value={snapshot.occupiedBedCount} />
      </div>

      <DeparturesSection
        snapshot={snapshot}
        resolveBedLabel={resolveBedLabel}
        onViewStay={onViewStay}
      />

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

      {paymentDueCallout && paymentDueCallout.unpaidCount > 0 ? (
        <button
          type="button"
          onClick={paymentDueCallout.onOpenCash}
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left',
            'text-amber-950 hover:bg-amber-100/80'
          )}
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium uppercase tracking-wide text-amber-900/80">
              Payment due
            </span>
            <span className="mt-0.5 block text-sm font-medium">
              {paymentDueCallout.unpaidCount} unpaid · {paymentDueCallout.stillDueLabel} still
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-amber-900">Open cash</span>
        </button>
      ) : null}

      {snapshot.keyNotIssued.length > 0 ? (
        <HubSection title="Key not issued">
          <HubArrivalList
            stays={snapshot.keyNotIssued}
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

      {snapshot.orphanStays.length > 0 ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {snapshot.orphanStays.length} access record(s) on unknown beds — fix the room map in admin.
        </p>
      ) : null}
    </div>
  );
}
