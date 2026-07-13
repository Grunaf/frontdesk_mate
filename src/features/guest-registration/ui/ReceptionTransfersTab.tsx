'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { GuestHubTransferRecord } from '@/entities/guest-hub-transfer';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import { formatDisplayDate } from '../lib/guestAccessDates';
import {
  listGuestHubTransfersAction,
  resolveGuestHubTransferAction,
} from '../actions/guestHubTransferActions';
import { Button, SegmentedChipBar } from '@/shared/ui';

const FILTER_ITEMS = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
] as const;

type TransfersFilter = (typeof FILTER_ITEMS)[number]['id'];

const HUB_LABELS: Record<GuestHubTransferRecord['hub_category'], string> = {
  airport: 'Airport',
  bus: 'Bus',
  train: 'Train',
};

const DIRECTION_LABELS: Record<GuestHubTransferRecord['direction'], string> = {
  to_hostel: 'To hostel',
  from_hostel: 'From hostel',
};

interface ReceptionTransfersTabProps {
  tenantSlug: string;
  openTransfers: GuestHubTransferRecord[];
  resolveBedLabel: (bedId: string) => string;
  onFocusStay: (stayId: string) => void;
  isActive: boolean;
  onOperationalRefresh: () => Promise<unknown>;
}

export function ReceptionTransfersTab({
  tenantSlug,
  openTransfers,
  resolveBedLabel,
  onFocusStay,
  isActive,
  onOperationalRefresh,
}: ReceptionTransfersTabProps) {
  const [filter, setFilter] = useState<TransfersFilter>('open');
  const [doneTransfers, setDoneTransfers] = useState<GuestHubTransferRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadDoneTransfers = useCallback(async () => {
    const updated = await listGuestHubTransfersAction(tenantSlug, 'done');
    setDoneTransfers(updated);
  }, [tenantSlug]);

  const transfers = filter === 'open' ? openTransfers : doneTransfers;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    void onOperationalRefresh();
  }, [isActive, onOperationalRefresh]);

  useEffect(() => {
    if (filter === 'done' && isActive) {
      void loadDoneTransfers();
    }
  }, [filter, isActive, loadDoneTransfers]);

  const handleFilterChange = (nextFilter: string) => {
    const resolved = nextFilter as TransfersFilter;
    setFilter(resolved);
    if (resolved === 'done') {
      void loadDoneTransfers();
    }
  };

  const handleResolve = (transferId: string) => {
    setError(null);

    startTransition(async () => {
      const result = await resolveGuestHubTransferAction({ tenantSlug, transferId });
      if (!result.ok) {
        setError(result.error === 'not_found' ? 'Transfer not found.' : 'Could not mark transfer done.');
        return;
      }

      await onOperationalRefresh();
      if (filter === 'done') {
        await loadDoneTransfers();
      }
    });
  };

  return (
    <div className="space-y-3">
      <SegmentedChipBar
        items={[...FILTER_ITEMS]}
        value={filter}
        onValueChange={handleFilterChange}
        ariaLabel="Transfer status"
        bleed={false}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {transfers.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {filter === 'open' ? 'No open transfer requests.' : 'No completed transfer requests yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {transfers.map((transfer) => {
            const stayRef = formatStayReference(transfer.stay_id);
            const hubLabel = HUB_LABELS[transfer.hub_category] ?? transfer.hub_category;
            const directionLabel = DIRECTION_LABELS[transfer.direction] ?? transfer.direction;
            const bedLabel = resolveBedLabel(transfer.bed_id);
            const guestLabel = transfer.guest_name?.trim() || 'Guest';
            const createdRelative = formatDistanceToNow(new Date(transfer.created_at), {
              addSuffix: true,
            });

            return (
              <li key={transfer.id} className="rounded-lg border bg-background px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <button
                      type="button"
                      className="text-left text-sm font-medium text-foreground hover:underline"
                      onClick={() => onFocusStay(transfer.stay_id)}
                    >
                      {guestLabel}
                      {stayRef ? (
                        <span className="font-mono text-muted-foreground"> · #{stayRef}</span>
                      ) : null}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {bedLabel} · {hubLabel} · {directionLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDisplayDate(transfer.requested_date)} · {transfer.requested_time}
                      {' · '}
                      Requested {createdRelative}
                    </p>
                    {transfer.note ? (
                      <p className="text-xs text-muted-foreground/80">“{transfer.note}”</p>
                    ) : null}
                  </div>

                  {transfer.status === 'open' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => handleResolve(transfer.id)}
                    >
                      Done
                    </Button>
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
