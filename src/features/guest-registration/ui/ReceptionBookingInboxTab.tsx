'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { BookingComExternalBookingRecord } from '@/entities/booking-com-external-booking';
import { formatBookingComInboxContactLine } from '@/shared/lib/booking-com-extension/parseBookingComExtranetFields';
import { buildBookingComReservationUrl } from '../lib/buildBookingComReservationUrl';
import { formatDisplayDate } from '../lib/guestAccessDates';
import {
  dismissBookingComExternalBookingAction,
  listBookingComExternalBookingsAction,
} from '../actions/bookingComExternalBookingActions';
import { Button, SegmentedChipBar } from '@/shared/ui';

const FILTER_ITEMS = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'dismissed', label: 'Dismissed' },
] as const;

type InboxFilter = (typeof FILTER_ITEMS)[number]['id'];

interface ReceptionBookingInboxTabProps {
  tenantSlug: string;
  openBookings: BookingComExternalBookingRecord[];
  isActive: boolean;
  onOperationalRefresh: () => Promise<unknown>;
  onIssueAccess: (booking: BookingComExternalBookingRecord) => void;
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

function formatAmount(booking: BookingComExternalBookingRecord): string | null {
  if (booking.amount == null) return null;
  const currency = booking.currency?.trim() || '';
  return currency ? `${booking.amount} ${currency}` : String(booking.amount);
}

export function ReceptionBookingInboxTab({
  tenantSlug,
  openBookings,
  isActive,
  onOperationalRefresh,
  onIssueAccess,
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

  const bookings = filter === 'open' ? openBookings : closedBookings;

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

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Booking.com inbox</h2>
        <p className="text-xs text-muted-foreground">
          Synced from Extranet via Chrome extension. Issue access when the guest arrives — nothing
          is created automatically.
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

      {bookings.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {filter === 'open'
            ? 'No open Booking.com reservations.'
            : filter === 'done'
              ? 'No issued bookings yet.'
              : 'No dismissed bookings.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {bookings.map((booking) => {
            const guestLabel = booking.guest_name?.trim() || 'Guest';
            const guestCount = formatGuestCount(booking);
            const amountLabel = formatAmount(booking);
            const createdRelative = formatDistanceToNow(new Date(booking.updated_at), {
              addSuffix: true,
            });
            const extranetUrl = buildBookingComReservationUrl({
              reservationId: booking.booking_id,
              hotelId: booking.hotel_id,
            });
            const statusNote =
              booking.booking_status !== 'ok' && booking.booking_status !== 'unknown'
                ? booking.booking_status.replace('_', ' ')
                : null;

            return (
              <li key={booking.id} className="rounded-lg border bg-background px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {guestLabel}
                      <span className="font-mono text-muted-foreground">
                        {' '}
                        · #{booking.booking_id}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.check_in ? formatDisplayDate(booking.check_in) : '—'}
                      {' → '}
                      {booking.check_out ? formatDisplayDate(booking.check_out) : '—'}
                      {guestCount ? ` · ${guestCount}` : null}
                      {' · '}
                      {formatBookingComInboxContactLine({
                        phone_number: booking.phone_number,
                        guest_email: booking.guest_email,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {amountLabel ? `${amountLabel} · ` : null}
                      {booking.room_name ? `${booking.room_name} · ` : null}
                      Updated {createdRelative}
                      {statusNote ? ` · ${statusNote}` : null}
                    </p>
                    {extranetUrl ? (
                      <a
                        href={extranetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Open in Extranet
                      </a>
                    ) : null}
                  </div>

                  {booking.inbox_status === 'open' ? (
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isPending || booking.booking_status === 'cancelled'}
                        onClick={() => onIssueAccess(booking)}
                      >
                        Issue access
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => handleDismiss(booking.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
