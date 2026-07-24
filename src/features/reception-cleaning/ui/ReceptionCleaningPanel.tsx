'use client';

import { useMemo, useState } from 'react';

import {
  HOUSEKEEPING_BED_STATUS_LABELS,
  HOUSEKEEPING_ROOM_STATUSES,
  HOUSEKEEPING_STAY_PRESENCE_LABELS,
  listHousekeepingBedStatusChoices,
  resolveHousekeepingBedPrimaryAction,
  type HousekeepingBedStatus,
  type HousekeepingLaundryProgram,
  type HousekeepingLaundryRunRecord,
  type HousekeepingRoomStatus,
  type HousekeepingStayPresenceStatus,
} from '@/entities/housekeeping';
import type { LaundryMachine } from '@/entities/tenant';
import { cn } from '@/shared/lib/utils';

import {
  resolveCleaningHubSnapshot,
  type CleaningBedEntry,
  type CleaningRoomBucket,
  type CleaningRoomGroup,
} from '../lib/resolveCleaningHubSnapshot';
import {
  countLaundryUnloadDue,
  resolveCleaningWashSummaryLabel,
  shouldShowCleaningWashSection,
} from '../lib/resolveCleaningWashVisibility';
import { LaundryMachinesPanel } from './LaundryMachinesPanel';
export type { CleaningRoomGroup };

const ROOM_STATUS_LABELS: Record<HousekeepingRoomStatus, string> = {
  cleaned: 'Cleaned',
  not_cleaned: 'Not cleaned',
};

export type CleaningBedPresenceLink = {
  stayId: string;
  guestName: string;
};

function nextRoomStatus(current: HousekeepingRoomStatus | undefined): HousekeepingRoomStatus {
  if (!current) return HOUSEKEEPING_ROOM_STATUSES[0];
  const index = HOUSEKEEPING_ROOM_STATUSES.indexOf(current);
  return HOUSEKEEPING_ROOM_STATUSES[(index + 1) % HOUSEKEEPING_ROOM_STATUSES.length];
}

function isSyntheticRoomId(roomId: string): boolean {
  return roomId.startsWith('__');
}

function roomStatusNeedsWork(status: HousekeepingRoomStatus): boolean {
  return status === 'not_cleaned';
}

function HubStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function RoomStatusChip({
  label,
  needsWork,
  unset,
  disabled,
  onClick,
}: {
  label: string;
  needsWork: boolean;
  unset: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-md border px-2 py-1 text-xs font-medium leading-tight transition-colors',
        unset && 'border-border bg-background text-muted-foreground hover:bg-muted/40',
        !unset && needsWork && 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
        !unset && !needsWork && 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      {label}
    </button>
  );
}

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

function BedRow({
  bed,
  busy,
  showPrimaryCta,
  presenceLink,
  presenceStatus,
  onSetBedStatus,
  onSetPresence,
  onClearPresence,
}: {
  bed: CleaningBedEntry;
  busy: boolean;
  showPrimaryCta: boolean;
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
  const primary = resolveHousekeepingBedPrimaryAction(status);
  const statusLabel = status ? HOUSEKEEPING_BED_STATUS_LABELS[status] : 'Unset';
  const showPresence = Boolean(presenceLink && onSetPresence && onClearPresence);

  return (
    <li className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm text-foreground">{bed.displayLabel}</span>
          <span className="ml-2 text-xs text-muted-foreground">{statusLabel}</span>
          {presenceLink ? (
            <span className="ml-2 text-xs text-muted-foreground">{presenceLink.guestName}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {showPrimaryCta && primary ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onSetBedStatus(bed.bedId, primary.nextStatus)}
              className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {primary.label}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => setChangeOpen((open) => !open)}
            className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40 disabled:opacity-60"
          >
            Change…
          </button>
        </div>
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
              Linen change — guest may still be here. Use Strip; this is not checkout.
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

function RoomBucketCard({
  room,
  busy,
  showPrimaryCta,
  bedPresenceByBedId,
  presenceByStayId,
  onSetBedStatus,
  onSetRoomStatus,
  onSetPresence,
  onClearPresence,
}: {
  room: CleaningRoomBucket;
  busy: boolean;
  showPrimaryCta: boolean;
  bedPresenceByBedId?: Record<string, CleaningBedPresenceLink>;
  presenceByStayId?: Record<string, HousekeepingStayPresenceStatus>;
  onSetBedStatus: (bedId: string, status: HousekeepingBedStatus) => void;
  onSetRoomStatus: (roomId: string, status: HousekeepingRoomStatus) => void;
  onSetPresence?: (
    stayId: string,
    bedId: string,
    status: HousekeepingStayPresenceStatus
  ) => void;
  onClearPresence?: (stayId: string) => void;
}) {
  const canSetRoom = !isSyntheticRoomId(room.roomId);
  const roomStatus = room.roomStatus;

  return (
    <li className="rounded-lg border bg-background px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{room.roomLabel}</p>
        {canSetRoom ? (
          <RoomStatusChip
            label={roomStatus ? ROOM_STATUS_LABELS[roomStatus] : 'Set room…'}
            needsWork={roomStatus ? roomStatusNeedsWork(roomStatus) : false}
            unset={!roomStatus}
            disabled={busy}
            onClick={() => onSetRoomStatus(room.roomId, nextRoomStatus(roomStatus))}
          />
        ) : null}
      </div>
      <ul className="mt-3 space-y-3 border-t border-border/60 pt-2">
        {room.beds.map((bed) => {
          const link = bedPresenceByBedId?.[bed.bedId];
          return (
            <BedRow
              key={bed.bedId}
              bed={bed}
              busy={busy}
              showPrimaryCta={showPrimaryCta}
              presenceLink={link}
              presenceStatus={link ? presenceByStayId?.[link.stayId] : undefined}
              onSetBedStatus={onSetBedStatus}
              onSetPresence={onSetPresence}
              onClearPresence={onClearPresence}
            />
          );
        })}
      </ul>
    </li>
  );
}

export type ReceptionCleaningPanelProps = {
  roomGroups: CleaningRoomGroup[];
  bedStatuses: Record<string, HousekeepingBedStatus>;
  roomStatuses: Record<string, HousekeepingRoomStatus>;
  laundryMachines: LaundryMachine[];
  activeLaundryRuns: HousekeepingLaundryRunRecord[];
  bedPresenceByBedId?: Record<string, CleaningBedPresenceLink>;
  presenceByStayId?: Record<string, HousekeepingStayPresenceStatus>;
  onSetBedStatus: (bedId: string, status: HousekeepingBedStatus) => void;
  onSetRoomStatus: (roomId: string, status: HousekeepingRoomStatus) => void;
  onSetPresence?: (
    stayId: string,
    bedId: string,
    status: HousekeepingStayPresenceStatus
  ) => void;
  onClearPresence?: (stayId: string) => void;
  onStartLaundry: (machineId: string, program: HousekeepingLaundryProgram) => void;
  onCompleteLaundry: (runId: string) => void;
  onCancelLaundry: (runId: string) => void;
  busy?: boolean;
};

export function ReceptionCleaningPanel({
  roomGroups,
  bedStatuses,
  roomStatuses,
  laundryMachines,
  activeLaundryRuns,
  bedPresenceByBedId,
  presenceByStayId,
  onSetBedStatus,
  onSetRoomStatus,
  onSetPresence,
  onClearPresence,
  onStartLaundry,
  onCompleteLaundry,
  onCancelLaundry,
  busy = false,
}: ReceptionCleaningPanelProps) {
  const snapshot = useMemo(
    () => resolveCleaningHubSnapshot(roomGroups, bedStatuses, roomStatuses),
    [roomGroups, bedStatuses, roomStatuses]
  );

  const showWashSection = shouldShowCleaningWashSection({
    makeCount: snapshot.makeCount,
    activeRuns: activeLaundryRuns,
    machineCount: laundryMachines.length,
  });
  const unloadDueCount = countLaundryUnloadDue(activeLaundryRuns);
  const runningCount = activeLaundryRuns.filter((run) => run.status === 'running').length;
  const washSummary = resolveCleaningWashSummaryLabel({
    makeCount: snapshot.makeCount,
    unloadDueCount,
    runningCount,
  });

  if (roomGroups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No rooms or beds configured. Add beds in property settings.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">Cleaning</h2>

      <div className="grid grid-cols-3 gap-2">
        <HubStat label="Strip" value={snapshot.stripCount} />
        <HubStat label="Make" value={snapshot.makeCount} />
        <HubStat label="Done" value={snapshot.doneCount} />
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To do</h3>
        {snapshot.todoRooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing left to do.</p>
        ) : (
          <ul className="space-y-3">
            {snapshot.todoRooms.map((room) => (
              <RoomBucketCard
                key={room.roomId}
                room={room}
                busy={busy}
                showPrimaryCta
                bedPresenceByBedId={bedPresenceByBedId}
                presenceByStayId={presenceByStayId}
                onSetBedStatus={onSetBedStatus}
                onSetRoomStatus={onSetRoomStatus}
                onSetPresence={onSetPresence}
                onClearPresence={onClearPresence}
              />
            ))}
          </ul>
        )}
      </section>

      {snapshot.doneCount > 0 ? (
        <details className="group rounded-lg border border-dashed border-muted-foreground/30 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Done ({snapshot.doneCount})
          </summary>
          <ul className="mt-3 space-y-3">
            {snapshot.doneRooms.map((room) => (
              <RoomBucketCard
                key={room.roomId}
                room={room}
                busy={busy}
                showPrimaryCta={false}
                bedPresenceByBedId={bedPresenceByBedId}
                presenceByStayId={presenceByStayId}
                onSetBedStatus={onSetBedStatus}
                onSetRoomStatus={onSetRoomStatus}
                onSetPresence={onSetPresence}
                onClearPresence={onClearPresence}
              />
            ))}
          </ul>
        </details>
      ) : null}

      {showWashSection ? (
        <details
          className={cn(
            'group rounded-lg border px-3 py-2',
            unloadDueCount > 0
              ? 'border-amber-200 bg-amber-50'
              : 'border-dashed border-muted-foreground/30'
          )}
        >
          <summary
            className={cn(
              'cursor-pointer text-xs font-medium uppercase tracking-wide',
              unloadDueCount > 0 ? 'text-amber-900/80' : 'text-muted-foreground'
            )}
          >
            {washSummary}
          </summary>
          <div className="mt-3">
            <LaundryMachinesPanel
              machines={laundryMachines}
              activeRuns={activeLaundryRuns}
              busy={busy}
              hideHeading
              onStart={onStartLaundry}
              onComplete={onCompleteLaundry}
              onCancel={onCancelLaundry}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
