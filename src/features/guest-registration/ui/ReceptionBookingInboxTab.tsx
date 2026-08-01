'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import type { BookingComExternalBookingRecord } from '@/entities/booking-com-external-booking';
import {
  BOOKING_COM_LIST_PRICE_ONLY_INBOX_HINT,
  formatBookingComInboxAmountLine,
  hasBookingComListPriceOnlyWarning,
  partitionBookingComInboxOpenRows,
  resolveLinkedStayIdForBookingComInbox,
} from '@/entities/booking-com-external-booking';
import { formatBookingComInboxContactLine } from '@/shared/lib/booking-com-extension/parseBookingComExtranetFields';
import { buildBookingComReservationUrl } from '../lib/buildBookingComReservationUrl';
import { formatDisplayDate } from '../lib/guestAccessDates';
import {
  dismissBookingComExternalBookingAction,
  listBookingComExternalBookingsAction,
} from '../actions/bookingComExternalBookingActions';
import { Badge, Button, SegmentedChipBar } from '@/shared/ui';

const FILTER_ITEMS = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'dismissed', label: 'Dismissed' },
] as const;

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
  const amountLabel = formatBookingComInboxAmountLine(booking);
  const listPriceOnlyWarning = hasBookingComListPriceOnlyWarning(booking);
  const contactLine = formatBookingComInboxContactLine({
    phone_number: booking.phone_number,
    guest_email: booking.guest_email,
  });
  const extranetUrl = buildBookingComReservationUrl({
    reservationId: booking.booking_id,
    hotelId: booking.hotel_id,
  });
  const isCancelled = booking.booking_status === 'cancelled';
  const badgeLabel = statusBadgeLabel(booking.booking_status);

  return (
    <li
      className={
        muted
          ? 'rounded-lg border border-dashed bg-muted/30 px-3 py-2.5'
          : 'rounded-lg border bg-background px-3 py-2.5'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm font-medium text-foreground">{guestLabel}</p>
            <span className="font-mono text-xs text-muted-foreground">#{booking.booking_id}</span>
            {badgeLabel ? (
              <Badge variant="warning" className="text-[10px]">
                {badgeLabel}
              </Badge>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            {booking.check_in ? formatDisplayDate(booking.check_in) : '—'}
            {' → '}
            {booking.check_out ? formatDisplayDate(booking.check_out) : '—'}
            {guestCount ? ` · ${guestCount}` : null}
          </p>

          <p className="truncate text-xs text-muted-foreground">{contactLine}</p>

          {amountLabel || booking.room_name ? (
            <p className="text-xs text-muted-foreground">
              {amountLabel}
              {amountLabel && booking.room_name ? ' · ' : null}
              {booking.room_name ? booking.room_name : null}
            </p>
          ) : null}

          {listPriceOnlyWarning || extranetUrl ? (
            <p className="text-xs">
              {listPriceOnlyWarning ? (
                <span className="text-amber-800 dark:text-amber-200">
                  {BOOKING_COM_LIST_PRICE_ONLY_INBOX_HINT}
                  {extranetUrl ? ' · ' : null}
                </span>
              ) : null}
              {extranetUrl ? (
                <a
                  href={extranetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Open in Extranet
                </a>
              ) : null}
            </p>
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
                disabled={isPending || isCancelled}
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

  const openEmpty =
    openPartition.needsAction.length === 0 && openPartition.alreadyInSystem.length === 0;

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
