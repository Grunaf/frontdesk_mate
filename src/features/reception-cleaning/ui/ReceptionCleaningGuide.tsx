'use client';

import { useState } from 'react';

import {
  HOUSEKEEPING_BED_STATUS_LABELS,
  HOUSEKEEPING_STAY_PRESENCE_LABELS,
  listHousekeepingBedStatusChoices,
  resolveRoomBedBatchAction,
  type HousekeepingBedStatus,
  type HousekeepingStayPresenceStatus,
} from '@/entities/housekeeping';
import { cn } from '@/shared/lib/utils';

import type { CleaningBedEntry, CleaningRoomBucket } from '../lib/resolveCleaningHubSnapshot';

export type CleaningBedPresenceLink = {
  stayId: string;
  guestName: string;
};

function PresenceChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-md border px-2 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-muted/40',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      {label}
    </button>
  );
}

export function CleaningBedRow({
  bed,
  busy,
  presenceLink,
  presenceStatus,
  onSetBedStatus,
  onSetPresence,
  onClearPresence,
}: {
  bed: CleaningBedEntry;
  busy: boolean;
  presenceLink?: CleaningBedPresenceLink;
  presenceStatus?: HousekeepingStayPresenceStatus;
  onSetBedStatus: (bedId: string, status: HousekeepingBedStatus) => void;
  onSetPresence?: (
    stayId: string,
    bedId: string,
    status: HousekeepingStayPresenceStatus
  ) => void;
  onClearPresence?: (stayId: string) => void;
}) {
  const [changeOpen, setChangeOpen] = useState(false);
  const status = bed.status;
  const statusLabel = status ? HOUSEKEEPING_BED_STATUS_LABELS[status] : 'Unset';
  const showPresence = Boolean(presenceLink && onSetPresence && onClearPresence);

  return (
    <li className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm text-foreground">{bed.displayLabel}</span>
          <span className="ml-2 text-xs text-muted-foreground">{statusLabel}</span>
          {bed.arrivalHint ? (
            <span className="ml-2 text-xs text-muted-foreground">{bed.arrivalHint}</span>
          ) : null}
          {presenceLink ? (
            <span className="ml-2 text-xs text-muted-foreground">{presenceLink.guestName}</span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => setChangeOpen((open) => !open)}
          className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40 disabled:opacity-60"
        >
          Change…
        </button>
      </div>
      {showPresence && presenceLink ? (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <PresenceChip
              label={HOUSEKEEPING_STAY_PRESENCE_LABELS.vacant}
              active={presenceStatus === 'vacant'}
              disabled={busy}
              onClick={() => onSetPresence?.(presenceLink.stayId, bed.bedId, 'vacant')}
            />
            <PresenceChip
              label={HOUSEKEEPING_STAY_PRESENCE_LABELS.still_here}
              active={presenceStatus === 'still_here'}
              disabled={busy}
              onClick={() => onSetPresence?.(presenceLink.stayId, bed.bedId, 'still_here')}
            />
            {presenceStatus ? (
              <PresenceChip
                label="Clear"
                active={false}
                disabled={busy}
                onClick={() => onClearPresence?.(presenceLink.stayId)}
              />
            ) : null}
          </div>
          {presenceStatus === 'still_here' ? (
            <p className="text-xs text-muted-foreground">
              Checkout day — guest may still be here. Mark Vacant when they leave so linen can go early.
            </p>
          ) : null}
        </div>
      ) : null}
      {changeOpen ? (
        <div className="flex flex-wrap gap-1.5 rounded-md border border-dashed bg-muted/20 px-2 py-2">
          {listHousekeepingBedStatusChoices().map((choice) => (
            <button
              key={choice}
              type="button"
              disabled={busy || choice === status}
              onClick={() => {
                onSetBedStatus(bed.bedId, choice);
                setChangeOpen(false);
              }}
              className={cn(
                'rounded-md border px-2 py-1 text-xs font-medium',
                choice === status
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'bg-background hover:bg-muted/40',
                busy && 'opacity-60'
              )}
            >
              {HOUSEKEEPING_BED_STATUS_LABELS[choice]}
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export type ReceptionCleaningGuideProps = {
  current: CleaningRoomBucket | null;
  next: CleaningRoomBucket | null;
  remainingCount: number;
  busy: boolean;
  bedPresenceByBedId?: Record<string, CleaningBedPresenceLink>;
  presenceByStayId?: Record<string, HousekeepingStayPresenceStatus>;
  onSetBedStatus: (bedId: string, status: HousekeepingBedStatus) => void;
  onSetBedStatuses: (updates: Record<string, HousekeepingBedStatus>) => void;
  onSetPresence?: (
    stayId: string,
    bedId: string,
    status: HousekeepingStayPresenceStatus
  ) => void;
  onClearPresence?: (stayId: string) => void;
  onSkipRoom: () => void;
  onShowAllRooms: () => void;
};

export function ReceptionCleaningGuide({
  current,
  next,
  remainingCount,
  busy,
  bedPresenceByBedId,
  presenceByStayId,
  onSetBedStatus,
  onSetBedStatuses,
  onSetPresence,
  onClearPresence,
  onSkipRoom,
  onShowAllRooms,
}: ReceptionCleaningGuideProps) {
  if (!current) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed px-3 py-6 text-center">
        <p className="text-sm font-medium text-foreground">Nothing left to do</p>
        <p className="text-sm text-muted-foreground">All todo rooms are clear for now.</p>
        <button
          type="button"
          onClick={onShowAllRooms}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Open All rooms
        </button>
      </div>
    );
  }

  const batch = resolveRoomBedBatchAction(current.beds);

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <h3 className="text-lg font-semibold tracking-tight">{current.roomLabel}</h3>
        {current.todayArrivalCount && current.todayArrivalCount > 0 ? (
          <p className="text-sm text-muted-foreground">Today · {current.todayArrivalCount}</p>
        ) : null}
      </div>

      {batch ? (
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const updates: Record<string, HousekeepingBedStatus> = {};
              for (const bedId of batch.bedIds) {
                updates[bedId] = batch.nextStatus;
              }
              onSetBedStatuses(updates);
            }}
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-60"
          >
            {batch.label} ({batch.bedIds.length})
          </button>
          {next ? (
            <p className="text-center text-xs text-muted-foreground">Next: {next.roomLabel}</p>
          ) : null}
        </div>
      ) : null}

      <ul className="space-y-3 border-t border-border/60 pt-3">
        {current.beds.map((bed) => {
          const link = bedPresenceByBedId?.[bed.bedId];
          return (
            <CleaningBedRow
              key={bed.bedId}
              bed={bed}
              busy={busy}
              presenceLink={link}
              presenceStatus={link ? presenceByStayId?.[link.stayId] : undefined}
              onSetBedStatus={onSetBedStatus}
              onSetPresence={onSetPresence}
              onClearPresence={onClearPresence}
            />
          );
        })}
      </ul>

      {remainingCount > 1 ? (
        <button
          type="button"
          disabled={busy}
          onClick={onSkipRoom}
          className="w-full rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-60"
        >
          Skip room
        </button>
      ) : null}
    </div>
  );
}
