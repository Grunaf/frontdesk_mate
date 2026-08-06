'use client';

import type { ReactNode } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { stayRecordCheckInDate } from '@/entities/guest-stay';
import { housekeepingStayPresenceDeskLabel } from '@/entities/housekeeping';
import { formatDisplayDate } from '../lib/guestAccessDates';
import { countBookingGroupMembers } from '../lib/collapseStaysByBookingGroup';
import {
  groupHubStaysByRoom,
  type HubRoomRef,
} from '../lib/groupHubStaysByRoom';
import { resolvePartyLeadName, resolvePartyTitle } from '../lib/resolvePartyTitle';
import type { DepartureSectionPhase } from '../lib/resolveDepartureSectionPhase';
import type { ReceptionHubSnapshot } from '../lib/resolveReceptionHubSnapshot';
import { BookingGroupIcon } from './BookingGroupIcon';
import { cn } from '@/shared/lib/utils';

interface ReceptionHubViewProps {
  snapshot: ReceptionHubSnapshot;
  resolveBedLabel: (bedId: string) => string;
  /** Inventory rooms — hub stay lists group by these (order preserved). */
  hubRooms: readonly HubRoomRef[];
  /** Full operational stays — party size for hub row labels. */
  planStays?: GuestStayRecordWithLink[];
  onViewStay: (stayId: string) => void;
  onOpenFreeBeds?: () => void;
  operationalDayUpdatedNotice?: boolean;
  /** Cleaning soft presence (Vacant / Still here) by stay id. */
  presenceByStayId?: Record<string, 'vacant' | 'still_here'>;
  /** desk.check_in: Start operational day control next to operational caption. */
  housekeepingDayStart?: {
    kind: 'ready' | 'before_start' | 'already_rolled' | 'loading';
    startTimeLabel: string;
    targetOperationalDate: string;
    busy?: boolean;
    onStart: () => void;
  } | null;
  /** When set, Payment due becomes a compact callout into Cash. */
  paymentDueCallout?: {
    unpaidCount: number;
    stillDueLabel: string;
    leavesTomorrowCount?: number;
    onOpenCash: () => void;
  } | null;
  /** Interrupt shortcuts into Issues / Transfers (More children). */
  interruptCallouts?: {
    openIssuesCount: number;
    openTransfersCount: number;
    onOpenIssues: () => void;
    onOpenTransfers: () => void;
  } | null;
  /**
   * Receptionist control: beds still without a cleaning status after tracking is on.
   * Edits happen in Cleaning — not on Plan.
   */
  cleaningStatusesUnsetCallout?: {
    unsetCount: number;
    onOpenCleaning?: () => void;
  } | null;
}

function formatOperationalDayCaption(
  snapshot: ReceptionHubSnapshot,
  options?: { dayStarted?: boolean }
): string {
  const { operationalDate } = snapshot.operational;
  const startLabel = snapshot.operationalDayStartTime;
  const base = `Operational day · ${formatDisplayDate(operationalDate)} · starts ${startLabel}`;
  return options?.dayStarted ? `${base} · Operational day started` : base;
}

function hubStayPrimaryLabel(
  stay: GuestStayRecordWithLink,
  planStays: GuestStayRecordWithLink[]
): string {
  const groupId = stay.booking_group_id?.trim();
  if (!groupId) {
    return stay.guest_name?.trim() || 'Guest';
  }
  const members = planStays.filter((entry) => entry.booking_group_id === groupId);
  const size = members.length > 0 ? members.length : countBookingGroupMembers(planStays, groupId);
  if (size <= 1) {
    return stay.guest_name?.trim() || 'Guest';
  }
  const leadName = resolvePartyLeadName(members.length > 0 ? members : [stay]);
  return resolvePartyTitle(leadName || stay.guest_name?.trim() || '', size);
}

function hubStaySecondaryLabel(
  stay: GuestStayRecordWithLink,
  bedLabel: string,
  planStays: GuestStayRecordWithLink[],
  resolveSecondary?: (stay: GuestStayRecordWithLink, bedLabel: string) => string
): string {
  const groupId = stay.booking_group_id?.trim();
  const size = countBookingGroupMembers(planStays, groupId);
  if (groupId && size > 1) {
    // Primary already has `Lead · N beds` — secondary is arrival date only.
    return formatDisplayDate(stayRecordCheckInDate(stay));
  }
  return resolveSecondary?.(stay, bedLabel) ?? `${bedLabel} · ${formatDisplayDate(stayRecordCheckInDate(stay))}`;
}

function HubArrivalList({
  stays,
  planStays,
  hubRooms,
  resolveBedLabel,
  onViewStay,
  emptyLabel,
  resolveSecondary,
}: {
  stays: GuestStayRecordWithLink[];
  planStays: GuestStayRecordWithLink[];
  hubRooms: readonly HubRoomRef[];
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

  const roomGroups = groupHubStaysByRoom({ stays, rooms: hubRooms });

  return (
    <div className="space-y-3">
      {roomGroups.map((group) => (
        <div key={group.roomId} className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{group.roomLabel}</p>
          <ul className="space-y-1.5">
            {group.stays.map((stay) => {
              const bedLabel = resolveBedLabel(stay.bed_id);
              const guestLabel = hubStayPrimaryLabel(stay, planStays);
              const secondary = hubStaySecondaryLabel(stay, bedLabel, planStays, resolveSecondary);
              const isGroup =
                countBookingGroupMembers(planStays, stay.booking_group_id) > 1 &&
                Boolean(stay.booking_group_id?.trim());

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
                    <span className="flex min-w-0 items-center gap-1.5">
                      {isGroup ? <BookingGroupIcon /> : null}
                      <span className="truncate font-medium">{guestLabel}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{secondary}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
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
  planStays,
  hubRooms,
  resolveBedLabel,
  onViewStay,
  presenceByStayId,
}: {
  snapshot: ReceptionHubSnapshot;
  planStays: GuestStayRecordWithLink[];
  hubRooms: readonly HubRoomRef[];
  resolveBedLabel: (bedId: string) => string;
  onViewStay: (stayId: string) => void;
  presenceByStayId?: Record<string, 'vacant' | 'still_here'>;
}) {
  const { departures, departurePhase, checkOutTimeLabel } = snapshot;
  if (departures.length === 0) return null;

  const title = departureSectionTitle(departurePhase, departures.length);
  const list = (
    <HubArrivalList
      stays={departures}
      planStays={planStays}
      hubRooms={hubRooms}
      resolveBedLabel={resolveBedLabel}
      onViewStay={onViewStay}
      resolveSecondary={(stay, bedLabel) => {
        const base = checkOutTimeLabel ? `${bedLabel} · by ${checkOutTimeLabel}` : bedLabel;
        const presence = housekeepingStayPresenceDeskLabel(presenceByStayId?.[stay.id]);
        return presence ? `${base} · ${presence}` : base;
      }}
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
  hubRooms,
  planStays = [],
  onViewStay,
  onOpenFreeBeds,
  operationalDayUpdatedNotice = false,
  presenceByStayId,
  housekeepingDayStart = null,
  paymentDueCallout = null,
  interruptCallouts = null,
  cleaningStatusesUnsetCallout = null,
}: ReceptionHubViewProps) {
  const showInterruptRow = interruptCallouts !== null;

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
      {cleaningStatusesUnsetCallout && cleaningStatusesUnsetCallout.unsetCount > 0 ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium text-amber-950">Cleaning statuses not set</p>
            <p className="text-[11px] text-amber-900/80">
              {cleaningStatusesUnsetCallout.unsetCount === 1
                ? '1 bed still needs a status. Housekeeping should set it in Cleaning.'
                : `${cleaningStatusesUnsetCallout.unsetCount} beds still need a status. Housekeeping should set them in Cleaning.`}
            </p>
          </div>
          {cleaningStatusesUnsetCallout.onOpenCleaning ? (
            <button
              type="button"
              onClick={cleaningStatusesUnsetCallout.onOpenCleaning}
              className="shrink-0 text-xs font-medium text-amber-950 underline-offset-4 hover:underline"
            >
              Open Cleaning
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {formatOperationalDayCaption(snapshot, {
            dayStarted: housekeepingDayStart?.kind === 'already_rolled',
          })}
        </p>
        {housekeepingDayStart && housekeepingDayStart.kind !== 'already_rolled' ? (
          <button
            type="button"
            disabled={housekeepingDayStart.busy || housekeepingDayStart.kind === 'loading'}
            onClick={housekeepingDayStart.onStart}
            className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-60"
          >
            {housekeepingDayStart.kind === 'before_start'
              ? 'Start operational day early…'
              : 'Start operational day'}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <OccupancyStatBlock
          label="Free"
          value={snapshot.freeBedEntries.length}
          onClick={onOpenFreeBeds}
        />
        <OccupancyStatBlock label="Occupied" value={snapshot.occupiedBedCount} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <OccupancyStatBlock label="Checked in" value={snapshot.checkedInTodayCount} />
        <OccupancyStatBlock label="Remaining" value={snapshot.remainingArrivalsCount} />
      </div>

      {showInterruptRow && interruptCallouts ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={interruptCallouts.onOpenIssues}
            className="rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Issues
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {interruptCallouts.openIssuesCount}
            </p>
          </button>
          <button
            type="button"
            onClick={interruptCallouts.onOpenTransfers}
            className="rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Transfers
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {interruptCallouts.openTransfersCount}
            </p>
          </button>
        </div>
      ) : null}

      <DeparturesSection
        snapshot={snapshot}
        planStays={planStays}
        hubRooms={hubRooms}
        resolveBedLabel={resolveBedLabel}
        onViewStay={onViewStay}
        presenceByStayId={presenceByStayId}
      />

      <HubSection title="Expected arrivals">
        <HubArrivalList
          stays={snapshot.expectedToday}
          planStays={planStays}
          hubRooms={hubRooms}
          resolveBedLabel={resolveBedLabel}
          onViewStay={onViewStay}
          emptyLabel="No check-ins expected for this operational day."
        />
      </HubSection>

      {snapshot.stillExpected.length > 0 ? (
        <HubSection title="Still expected">
          <HubArrivalList
            stays={snapshot.stillExpected}
            planStays={planStays}
            hubRooms={hubRooms}
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
              {paymentDueCallout.leavesTomorrowCount &&
              paymentDueCallout.leavesTomorrowCount > 0
                ? ` · ${paymentDueCallout.leavesTomorrowCount} leave tomorrow`
                : ''}
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-amber-900">Open cash</span>
        </button>
      ) : null}

      {snapshot.keyNotIssued.length > 0 ? (
        <HubSection title="Key not issued">
          <HubArrivalList
            stays={snapshot.keyNotIssued}
            planStays={planStays}
            hubRooms={hubRooms}
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
              planStays={planStays}
              hubRooms={hubRooms}
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
