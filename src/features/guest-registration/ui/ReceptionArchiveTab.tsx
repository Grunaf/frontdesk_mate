'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';

import type { GuestReservationArchiveListItem } from '@/entities/guest-stay/model/types';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import { Button } from '@/shared/ui';

import {
  getGuestReservationForDeskAction,
  listArchivedGuestReservationsAction,
  restoreGuestReservationAction,
} from '../actions/receptionActions';
import { formatDisplayDate } from '../lib/guestAccessDates';

interface ReceptionArchiveTabProps {
  tenantSlug: string;
  isActive: boolean;
  resolveBedLabel: (bedId: string) => string;
  onOperationalRefresh?: () => void | Promise<void>;
  onOpenOriginal?: (stay: GuestStayRecordWithLink) => void;
}

export function ReceptionArchiveTab({
  tenantSlug,
  isActive,
  resolveBedLabel,
  onOperationalRefresh,
  onOpenOriginal,
}: ReceptionArchiveTabProps) {
  const [items, setItems] = useState<GuestReservationArchiveListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await listArchivedGuestReservationsAction(tenantSlug);
    setLoading(false);
    if (!result.ok) {
      setLoadError(
        result.error === 'unauthorized'
          ? 'Sign in again at reception desk.'
          : 'Could not load Archive.'
      );
      setItems([]);
      return;
    }
    setItems(result.items);
  }, [tenantSlug]);

  useEffect(() => {
    if (!isActive) return;
    void reload();
  }, [isActive, reload]);

  const handleRestore = (stayId: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await restoreGuestReservationAction({ tenantSlug, stayId });
      if (!result.ok) {
        setActionError(
          result.error === 'original_missing'
            ? 'Cannot restore remainder — original booking is missing.'
            : result.error === 'access_overlap'
              ? 'Cannot restore — bed nights overlap another booking.'
              : 'Could not restore booking.'
        );
        return;
      }
      await reload();
      await onOperationalRefresh?.();
    });
  };

  const handleOpenOriginal = (item: GuestReservationArchiveListItem) => {
    if (!item.original_reservation_id || !item.original_exists || !onOpenOriginal) return;
    setActionError(null);
    startTransition(async () => {
      const result = await getGuestReservationForDeskAction({
        tenantSlug,
        stayId: item.original_reservation_id!,
      });
      if (!result.ok) {
        setActionError(
          result.error === 'not_found'
            ? 'Original booking is no longer available.'
            : 'Could not open original booking.'
        );
        return;
      }
      onOpenOriginal(result.stay);
    });
  };

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  if (loading && items.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading Archive…</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Archive is empty.</p>;
  }

  return (
    <div className="space-y-3">
      {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}

      <ul className="space-y-2">
        {items.map((item) => {
          const ref = formatStayReference(item.id);
          const originalRef = item.original_reservation_id
            ? formatStayReference(item.original_reservation_id)
            : null;
          const archivedAtLabel = (() => {
            try {
              return new Intl.DateTimeFormat('en-GB', {
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(item.archived_at));
            } catch {
              return item.archived_at;
            }
          })();
          const reasonBadge =
            item.archive_reason === 'checked_out'
              ? 'Checked out'
              : item.archive_reason === 'cancelled'
                ? 'Cancelled'
                : null;

          return (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">
                  {item.guest_name?.trim() || 'Guest'}
                  {ref ? (
                    <span className="font-mono text-muted-foreground"> · #{ref}</span>
                  ) : null}
                </p>
                <p className="flex flex-wrap gap-1.5 text-xs">
                  {item.archive_kind === 'remainder' ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                      Remainder
                      {originalRef ? ` of #${originalRef}` : ''}
                    </span>
                  ) : null}
                  {reasonBadge ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {reasonBadge}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {resolveBedLabel(item.bed_id)} · {formatDisplayDate(item.check_in_date)} →{' '}
                  {formatDisplayDate(item.check_out_date)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Archived {archivedAtLabel}
                  {item.archived_by_display_name
                    ? ` · by ${item.archived_by_display_name}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {item.archive_kind === 'remainder' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending || !item.original_exists}
                    title={
                      item.original_exists
                        ? undefined
                        : 'Original booking is no longer available'
                    }
                    onClick={() => handleOpenOriginal(item)}
                  >
                    Open original
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRestore(item.id)}
                >
                  Restore
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** @deprecated Prefer ReceptionArchiveTab */
export { ReceptionArchiveTab as ReceptionTrashTab };
