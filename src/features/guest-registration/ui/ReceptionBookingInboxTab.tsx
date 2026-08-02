'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ShieldAlert } from 'lucide-react';
import type { BookingComExternalBookingRecord } from '@/entities/booking-com-external-booking';
import {
  BOOKING_COM_INBOX_SYNC_MISSING_DATA_HINT,
  needsBookingComInboxReservationSync,
  partitionBookingComInboxOpenRows,
  resolveLinkedStayIdForBookingComInbox,
} from '@/entities/booking-com-external-booking';
import { buildBookingComReservationUrl } from '../lib/buildBookingComReservationUrl';
import { formatDisplayDate } from '../lib/guestAccessDates';
import {
  dismissBookingComExternalBookingAction,
  listBookingComExternalBookingsAction,
} from '../actions/bookingComExternalBookingActions';
import { Badge, Button, Input, SegmentedChipBar } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

const FILTER_ITEMS = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'dismissed', label: 'Dismissed' },
] as const;

type InboxFilter = (typeof FILTER_ITEMS)[number]['id'];

function isIsoDay(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function bookingCheckInDay(booking: BookingComExternalBookingRecord): string | null {
  const raw = booking.check_in?.trim();
  if (!raw) return null;
  const day = raw.slice(0, 10);
  return isIsoDay(day) ? day : null;
}

function matchesArrivalDay(
  booking: BookingComExternalBookingRecord,
  arrivalDay: string
): boolean {
  if (!arrivalDay) return true;
  return bookingCheckInDay(booking) === arrivalDay;
}
interface ReceptionBookingInboxTabProps {
  tenantSlug: string;
  openBookings: BookingComExternalBookingRecord[];
  stays: Array<{
    id: string;
    booking_platform_id?: string | null;
    booking_external_id?: string | null;
  }>;
  isActive: boolean;
  onOperationalRefresh: () => Promise<unknown>;
  onAddStay: (booking: BookingComExternalBookingRecord) => void;
  onOpenStay: (stayId: string) => void;
}

function formatGuestCount(booking: BookingComExternalBookingRecord): string | null {
  const adults = booking.adults;
  const children = booking.children;
  if (adults == null && children == null) return null;
  const parts: string[] = [];
  if (adults != null) parts.push(`${adults} adult${adults === 1 ? '' : 's'}`);
  if (children != null && children > 0) {
    parts.push(`${children} child${children === 1 ? '' : 'ren'}`);
  }
  return parts.join(', ') || null;
}

function statusBadgeLabel(status: BookingComExternalBookingRecord['booking_status']): string | null {
  if (status === 'cancelled') return 'Canceled';
  if (status === 'no_show') return 'No-show';
  return null;
}

function InboxBookingCard({
  booking,
  linkedStayId,
  muted,
  isPending,
  showOpenActions,
  onAddStay,
  onOpenStay,
  onDismiss,
}: {
  booking: BookingComExternalBookingRecord;
  linkedStayId: string | null;
  muted?: boolean;
  isPending: boolean;
  showOpenActions: boolean;
  onAddStay: (booking: BookingComExternalBookingRecord) => void;
  onOpenStay: (stayId: string) => void;
  onDismiss: (bookingRowId: string) => void;
}) {
  const guestLabel = booking.guest_name?.trim() || 'Guest';
  const guestCount = formatGuestCount(booking);
  const isCancelled = booking.booking_status === 'cancelled';
  const showSyncCue = !isCancelled && needsBookingComInboxReservationSync(booking);
  const extranetUrl = buildBookingComReservationUrl({
    reservationId: booking.booking_id,
    hotelId: booking.hotel_id,
  });
  const badgeLabel = statusBadgeLabel(booking.booking_status);
  const inlineBadgeLabel = isCancelled ? null : badgeLabel;
  const bookingIdLabel = `#${booking.booking_id}`;
  const inactiveSurface = muted || isCancelled;

  return (
    <li
      className={
        inactiveSurface
          ? 'rounded-lg border border-dashed bg-muted/30 px-3 py-2.5'
          : 'rounded-lg border bg-background px-3 py-2.5'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {!isCancelled ? (
              showSyncCue ? (
                <ShieldAlert
                  aria-label={BOOKING_COM_INBOX_SYNC_MISSING_DATA_HINT}
                  className="size-4 shrink-0 text-amber-500 dark:text-amber-400"
                  title={BOOKING_COM_INBOX_SYNC_MISSING_DATA_HINT}
                />
              ) : (
                <span aria-hidden className="inline-block size-4 shrink-0" />
              )
            ) : null}
            <p className="truncate text-sm font-medium text-foreground">{guestLabel}</p>
            {extranetUrl ? (
              <a
                href={extranetUrl}
                target="_blank"
                rel="noreferrer"
                title="Open in Extranet"
                aria-label={`Open ${bookingIdLabel} in Extranet`}
                className="font-mono text-xs text-primary hover:underline"
              >
                {bookingIdLabel}
              </a>
            ) : (
              <span className="font-mono text-xs text-muted-foreground">{bookingIdLabel}</span>
            )}
            {inlineBadgeLabel ? (
              <Badge variant="warning" className="text-[10px]">
                {inlineBadgeLabel}
              </Badge>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            {booking.check_in ? formatDisplayDate(booking.check_in) : '—'}
            {' → '}
            {booking.check_out ? formatDisplayDate(booking.check_out) : '—'}
            {guestCount ? ` · ${guestCount}` : null}
          </p>

          {booking.room_name ? (
            <p className="truncate text-xs text-muted-foreground">{booking.room_name}</p>
          ) : null}
        </div>

        {showOpenActions ? (
          <div className="flex shrink-0 flex-col gap-1.5">
            {linkedStayId ? (
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => onOpenStay(linkedStayId)}
              >
                Open stay
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => onAddStay(booking)}
              >
                Add stay
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => onDismiss(booking.id)}
            >
              Dismiss
            </Button>
          </div>
        ) : linkedStayId ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => onOpenStay(linkedStayId)}
          >
            Open stay
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function ReceptionBookingInboxTab({
  tenantSlug,
  openBookings,
  stays,
  isActive,
  onOperationalRefresh,
  onAddStay,
  onOpenStay,
}: ReceptionBookingInboxTabProps) {
  const searchParams = useSearchParams();
  const inboxParam = searchParams.get('inbox');
  const dayParam = searchParams.get('day');

  const [filter, setFilter] = useState<InboxFilter>('open');
  const [needsSyncOnly, setNeedsSyncOnly] = useState(() => inboxParam === 'needs-sync');
  const [arrivalDay, setArrivalDay] = useState(() => (isIsoDay(dayParam) ? dayParam : ''));
  const [closedBookings, setClosedBookings] = useState<BookingComExternalBookingRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [canceledExpanded, setCanceledExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setNeedsSyncOnly(inboxParam === 'needs-sync');
    if (isIsoDay(dayParam)) {
      setArrivalDay(dayParam);
    }
    if (inboxParam === 'needs-sync') {
      setFilter('open');
    }
  }, [inboxParam, dayParam]);

  const loadClosed = useCallback(
    async (nextFilter: 'done' | 'dismissed') => {
      const updated = await listBookingComExternalBookingsAction(tenantSlug, nextFilter);
      setClosedBookings(updated);
    },
    [tenantSlug]
  );

  const openPartition = useMemo(
    () => partitionBookingComInboxOpenRows({ bookings: openBookings, stays }),
    [openBookings, stays]
  );

  const filteredNeedsAction = useMemo(() => {
    return openPartition.needsAction.filter(({ booking }) => {
      if (arrivalDay && !matchesArrivalDay(booking, arrivalDay)) return false;
      if (needsSyncOnly && !needsBookingComInboxReservationSync(booking)) return false;
      return true;
    });
  }, [openPartition.needsAction, arrivalDay, needsSyncOnly]);

  const filteredAlreadyInSystem = useMemo(() => {
    if (needsSyncOnly) {
      return openPartition.alreadyInSystem.filter(
        ({ booking }) =>
          matchesArrivalDay(booking, arrivalDay) && needsBookingComInboxReservationSync(booking)
      );
    }
    return openPartition.alreadyInSystem.filter(({ booking }) =>
      matchesArrivalDay(booking, arrivalDay)
    );
  }, [openPartition.alreadyInSystem, arrivalDay, needsSyncOnly]);

  const filteredCanceled = useMemo(() => {
    if (needsSyncOnly) return [];
    return openPartition.canceled.filter(({ booking }) =>
      matchesArrivalDay(booking, arrivalDay)
    );
  }, [openPartition.canceled, arrivalDay, needsSyncOnly]);

  const canceledCount = filteredCanceled.length;
  const showCanceledList = canceledExpanded;

  const closedBookingsWithLinks = useMemo(
    () =>
      closedBookings
        .filter((booking) => matchesArrivalDay(booking, arrivalDay))
        .map((booking) => ({
          booking,
          linkedStayId: resolveLinkedStayIdForBookingComInbox({ booking, stays }),
        })),
    [closedBookings, stays, arrivalDay]
  );

  useEffect(() => {
    if (!isActive) return;
    void onOperationalRefresh();
  }, [isActive, onOperationalRefresh]);

  useEffect(() => {
    if (!isActive) return;
    if (filter === 'done' || filter === 'dismissed') {
      void loadClosed(filter);
    }
  }, [filter, isActive, loadClosed]);

  const handleFilterChange = (nextFilter: string) => {
    const resolved = nextFilter as InboxFilter;
    setFilter(resolved);
    if (resolved === 'done' || resolved === 'dismissed') {
      void loadClosed(resolved);
    }
  };

  const handleDismiss = (bookingRowId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await dismissBookingComExternalBookingAction({
        tenantSlug,
        bookingRowId,
      });
      if (!result.ok) {
        setError(result.error === 'not_found' ? 'Booking not found.' : 'Could not dismiss booking.');
        return;
      }
      await onOperationalRefresh();
      if (filter === 'dismissed') {
        await loadClosed('dismissed');
      }
    });
  };

  const handleDismissAllCanceled = () => {
    const ids = filteredCanceled.map((row) => row.booking.id);
    if (ids.length === 0) return;
    setError(null);
    startTransition(async () => {
      for (const bookingRowId of ids) {
        const result = await dismissBookingComExternalBookingAction({
          tenantSlug,
          bookingRowId,
        });
        if (!result.ok) {
          setError(
            result.error === 'not_found'
              ? 'Booking not found.'
              : 'Could not dismiss canceled bookings.'
          );
          await onOperationalRefresh();
          return;
        }
      }
      await onOperationalRefresh();
      if (filter === 'dismissed') {
        await loadClosed('dismissed');
      }
    });
  };

  const openEmpty =
    filteredNeedsAction.length === 0 &&
    filteredAlreadyInSystem.length === 0 &&
    canceledCount === 0;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Booking.com inbox</h2>
        <p className="text-xs text-muted-foreground">
          Synced from Extranet. Add a stay to create the local booking; issue access later from the
          stay when the guest arrives.
        </p>
      </div>

      <SegmentedChipBar
        items={[...FILTER_ITEMS]}
        value={filter}
        onValueChange={handleFilterChange}
        ariaLabel="Booking inbox status"
        bleed={false}
      />

      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          <span>Arrival day</span>
          <Input
            type="date"
            value={arrivalDay}
            onChange={(event) => setArrivalDay(event.target.value)}
            className="h-9 w-[10.5rem]"
            aria-label="Filter by arrival day"
          />
        </label>
        {arrivalDay ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setArrivalDay('')}
          >
            Clear day
          </Button>
        ) : null}
        {filter === 'open' ? (
          <Button
            type="button"
            size="sm"
            variant={needsSyncOnly ? 'default' : 'secondary'}
            aria-pressed={needsSyncOnly}
            onClick={() => setNeedsSyncOnly((value) => !value)}
          >
            Needs sync
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {filter === 'open' ? (
        openEmpty ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {needsSyncOnly || arrivalDay
              ? 'No bookings match these filters.'
              : 'No open Booking.com reservations.'}
          </p>
        ) : (
          <div className="space-y-4">
            {canceledCount > 0 ? (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      aria-expanded={showCanceledList}
                      onClick={() => setCanceledExpanded((open) => !open)}
                    >
                      <ChevronDown
                        className={cn(
                          'size-3.5 shrink-0 transition-transform',
                          showCanceledList ? 'rotate-0' : '-rotate-90'
                        )}
                        aria-hidden
                      />
                      Canceled ({canceledCount})
                    </button>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={handleDismissAllCanceled}
                  >
                    Dismiss all
                  </Button>
                </div>
                {showCanceledList ? (
                  <ul className="space-y-2">
                    {filteredCanceled.map(({ booking, linkedStayId }) => (
                      <InboxBookingCard
                        key={booking.id}
                        booking={booking}
                        linkedStayId={linkedStayId}
                        muted
                        isPending={isPending}
                        showOpenActions={false}
                        onAddStay={onAddStay}
                        onOpenStay={onOpenStay}
                        onDismiss={handleDismiss}
                      />
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {filteredNeedsAction.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Needs action
                </h3>
                <ul className="space-y-2">
                  {filteredNeedsAction.map(({ booking }) => (
                    <InboxBookingCard
                      key={booking.id}
                      booking={booking}
                      linkedStayId={null}
                      isPending={isPending}
                      showOpenActions
                      onAddStay={onAddStay}
                      onOpenStay={onOpenStay}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {filteredAlreadyInSystem.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Already in system
                </h3>
                <ul className="space-y-2">
                  {filteredAlreadyInSystem.map(({ booking, linkedStayId }) => (
                    <InboxBookingCard
                      key={booking.id}
                      booking={booking}
                      linkedStayId={linkedStayId}
                      muted
                      isPending={isPending}
                      showOpenActions
                      onAddStay={onAddStay}
                      onOpenStay={onOpenStay}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )
      ) : closedBookingsWithLinks.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {filter === 'done' ? 'No added stays yet.' : 'No dismissed bookings.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {closedBookingsWithLinks.map(({ booking, linkedStayId }) => (
            <InboxBookingCard
              key={booking.id}
              booking={booking}
              linkedStayId={linkedStayId}
              isPending={isPending}
              showOpenActions={false}
              onAddStay={onAddStay}
              onOpenStay={onOpenStay}
              onDismiss={handleDismiss}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
