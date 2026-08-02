'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
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
import { Badge, Button, SegmentedChipBar } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

const FILTER_ITEMS = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'dismissed', label: 'Dismissed' },
] as const;

/** Collapse canceled list by default when count exceeds this. */
const CANCELED_COLLAPSE_THRESHOLD = 3;

type InboxFilter = (typeof FILTER_ITEMS)[number]['id'];

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
          {isCancelled ? (
            <Badge variant="destructive" className="text-[10px]">
              Canceled
            </Badge>
          ) : null}

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
  const [filter, setFilter] = useState<InboxFilter>('open');
  const [closedBookings, setClosedBookings] = useState<BookingComExternalBookingRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [canceledExpanded, setCanceledExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  const canceledCount = openPartition.canceled.length;
  const canceledCollapsible = canceledCount > CANCELED_COLLAPSE_THRESHOLD;
  const showCanceledList = !canceledCollapsible || canceledExpanded;

  const closedBookingsWithLinks = useMemo(
    () =>
      closedBookings.map((booking) => ({
        booking,
        linkedStayId: resolveLinkedStayIdForBookingComInbox({ booking, stays }),
      })),
    [closedBookings, stays]
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
    const ids = openPartition.canceled.map((row) => row.booking.id);
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
    openPartition.needsAction.length === 0 &&
    openPartition.alreadyInSystem.length === 0 &&
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {filter === 'open' ? (
        openEmpty ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No open Booking.com reservations.
          </p>
        ) : (
          <div className="space-y-4">
            {canceledCount > 0 ? (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {canceledCollapsible ? (
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
                    ) : (
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Canceled ({canceledCount})
                      </h3>
                    )}
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
                    {openPartition.canceled.map(({ booking, linkedStayId }) => (
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

            {openPartition.needsAction.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Needs action
                </h3>
                <ul className="space-y-2">
                  {openPartition.needsAction.map(({ booking }) => (
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

            {openPartition.alreadyInSystem.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Already in system
                </h3>
                <ul className="space-y-2">
                  {openPartition.alreadyInSystem.map(({ booking, linkedStayId }) => (
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
