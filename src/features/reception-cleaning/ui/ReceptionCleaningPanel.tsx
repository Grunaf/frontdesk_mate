'use client';

import { useMemo, useState } from 'react';

import {
  HOUSEKEEPING_ROOM_STATUSES,
  resolveRoomBedBatchAction,
  type HousekeepingBedStatus,
  type HousekeepingLaundryProgram,
  type HousekeepingLaundryRunRecord,
  type HousekeepingRoomStatus,
  type HousekeepingStayPresenceStatus,
} from '@/entities/housekeeping';
import type { LaundryMachine } from '@/entities/tenant';
import { cn } from '@/shared/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

import { resolveCleaningGuideQueue } from '../lib/resolveCleaningGuideQueue';
import {
  resolveCleaningHubSnapshot,
  type CleaningRoomBucket,
  type CleaningRoomGroup,
} from '../lib/resolveCleaningHubSnapshot';
import {
  countLaundryUnloadDue,
  resolveCleaningWashCalloutLabel,
  resolveCleaningWashTabBadgeCount,
  shouldShowCleaningWashTab,
} from '../lib/resolveCleaningWashVisibility';
import {
  CleaningBedRow,
  ReceptionCleaningGuide,
  type CleaningBedPresenceLink,
} from './ReceptionCleaningGuide';
import { LaundryMachinesPanel } from './LaundryMachinesPanel';

export type { CleaningRoomGroup, CleaningBedPresenceLink };

type CleaningViewMode = 'guide' | 'all';
type CleaningContextTab = 'rooms' | 'wash';

const ROOM_STATUS_LABELS: Record<HousekeepingRoomStatus, string> = {
  cleaned: 'Cleaned',
  not_cleaned: 'Not cleaned',
};

const VIEW_MODE_ITEMS: Array<{ id: CleaningViewMode; label: string }> = [
  { id: 'guide', label: 'Guide' },
  { id: 'all', label: 'All' },
];

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

function RoomBucketCard({
  room,
  busy,
  bedPresenceByBedId,
  presenceByStayId,
  onSetBedStatus,
  onSetBedStatuses,
  onSetRoomStatus,
  onSetPresence,
  onClearPresence,
}: {
  room: CleaningRoomBucket;
  busy: boolean;
  bedPresenceByBedId?: Record<string, CleaningBedPresenceLink>;
  presenceByStayId?: Record<string, HousekeepingStayPresenceStatus>;
  onSetBedStatus: (bedId: string, status: HousekeepingBedStatus) => void;
  onSetBedStatuses: (updates: Record<string, HousekeepingBedStatus>) => void;
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
  const batch = resolveRoomBedBatchAction(room.beds);

  return (
    <li className="rounded-lg border bg-background px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{room.roomLabel}</p>
          {room.todayArrivalCount && room.todayArrivalCount > 0 ? (
            <p className="text-xs text-muted-foreground">Today · {room.todayArrivalCount}</p>
          ) : null}
        </div>
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
      {batch ? (
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
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-60"
        >
          {batch.label} ({batch.bedIds.length})
        </button>
      ) : null}
      <ul className="mt-3 space-y-3 border-t border-border/60 pt-2">
        {room.beds.map((bed) => {
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
    </li>
  );
}

export type ReceptionCleaningPanelProps = {
  roomGroups: CleaningRoomGroup[];
  bedStatuses: Record<string, HousekeepingBedStatus>;
  roomStatuses: Record<string, HousekeepingRoomStatus>;
  laundryMachines: LaundryMachine[];
  activeLaundryRuns: HousekeepingLaundryRunRecord[];
  /** Earliest upcoming check-in date (YYYY-MM-DD) per bed — prioritizes To do. */
  nextCheckInByBedId?: Record<string, string>;
  operationalDate?: string;
  bedPresenceByBedId?: Record<string, CleaningBedPresenceLink>;
  presenceByStayId?: Record<string, HousekeepingStayPresenceStatus>;
  onSetBedStatus: (bedId: string, status: HousekeepingBedStatus) => void;
  onSetBedStatuses: (updates: Record<string, HousekeepingBedStatus>) => void;
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
  nextCheckInByBedId,
  operationalDate,
  bedPresenceByBedId,
  presenceByStayId,
  onSetBedStatus,
  onSetBedStatuses,
  onSetRoomStatus,
  onSetPresence,
  onClearPresence,
  onStartLaundry,
  onCompleteLaundry,
  onCancelLaundry,
  busy = false,
}: ReceptionCleaningPanelProps) {
  const [viewMode, setViewMode] = useState<CleaningViewMode>('guide');
  const [contextTab, setContextTab] = useState<CleaningContextTab>('rooms');
  const [skippedRoomIds, setSkippedRoomIds] = useState<string[]>([]);

  const snapshot = useMemo(
    () =>
      resolveCleaningHubSnapshot(roomGroups, bedStatuses, roomStatuses, {
        nextCheckInByBedId,
        operationalDate,
      }),
    [roomGroups, bedStatuses, roomStatuses, nextCheckInByBedId, operationalDate]
  );

  const guideQueue = useMemo(
    () => resolveCleaningGuideQueue(snapshot.todoRooms, { skippedRoomIds }),
    [snapshot.todoRooms, skippedRoomIds]
  );

  const showWashTab = shouldShowCleaningWashTab(laundryMachines.length);
  const unloadDueCount = countLaundryUnloadDue(activeLaundryRuns);
  const washTabBadge = resolveCleaningWashTabBadgeCount(unloadDueCount);
  const washCallout = resolveCleaningWashCalloutLabel({
    machines: laundryMachines,
    activeRuns: activeLaundryRuns,
    makeCount: snapshot.makeCount,
  });

  const activeContextTab: CleaningContextTab =
    showWashTab && contextTab === 'wash' ? 'wash' : 'rooms';

  const handleContextTabChange = (value: string) => {
    if (value === 'rooms' || value === 'wash') setContextTab(value);
  };

  const handleSkipRoom = () => {
    const roomId = guideQueue.current?.roomId;
    if (!roomId) return;
    setSkippedRoomIds((prev) => (prev.includes(roomId) ? prev : [...prev, roomId]));
  };

  if (roomGroups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No rooms or beds configured. Add beds in property settings.
      </p>
    );
  }

  const roomsContent = (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <HubStat label="Strip" value={snapshot.stripCount} />
        <HubStat label="Make" value={snapshot.makeCount} />
        <HubStat label="Done" value={snapshot.doneCount} />
      </div>

      {washCallout && showWashTab ? (
        <button
          type="button"
          onClick={() => setContextTab('wash')}
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left',
            unloadDueCount > 0
              ? 'border-amber-200 bg-amber-50 text-amber-950'
              : 'border-border bg-card text-foreground hover:bg-muted/40'
          )}
        >
          <span className="text-sm font-medium">{washCallout}</span>
          <span className="shrink-0 text-xs text-muted-foreground" aria-hidden>
            Wash →
          </span>
        </button>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          To do
        </h3>
        {snapshot.todoRooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing left to do.</p>
        ) : (
          <ul className="space-y-3">
            {snapshot.todoRooms.map((room) => (
              <RoomBucketCard
                key={room.roomId}
                room={room}
                busy={busy}
                bedPresenceByBedId={bedPresenceByBedId}
                presenceByStayId={presenceByStayId}
                onSetBedStatus={onSetBedStatus}
                onSetBedStatuses={onSetBedStatuses}
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
                bedPresenceByBedId={bedPresenceByBedId}
                presenceByStayId={presenceByStayId}
                onSetBedStatus={onSetBedStatus}
                onSetBedStatuses={onSetBedStatuses}
                onSetRoomStatus={onSetRoomStatus}
                onSetPresence={onSetPresence}
                onClearPresence={onClearPresence}
              />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );

  const allRoomsContent = showWashTab ? (
    <Tabs value={activeContextTab} onValueChange={handleContextTabChange}>
      <TabsList variant="line" className="mb-4 w-full justify-start">
        <TabsTrigger value="rooms">Rooms</TabsTrigger>
        <TabsTrigger value="wash">
          {washTabBadge > 0 ? `Wash · ${washTabBadge}` : 'Wash'}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="rooms">{roomsContent}</TabsContent>
      <TabsContent value="wash">
        <LaundryMachinesPanel
          machines={laundryMachines}
          activeRuns={activeLaundryRuns}
          busy={busy}
          onStart={onStartLaundry}
          onComplete={onCompleteLaundry}
          onCancel={onCancelLaundry}
        />
      </TabsContent>
    </Tabs>
  ) : (
    roomsContent
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Cleaning</h2>
        <div
          role="tablist"
          aria-label="Cleaning view"
          className="inline-flex rounded-md border border-border bg-muted/30 p-0.5"
        >
          {VIEW_MODE_ITEMS.map((item) => {
            const active = viewMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(item.id)}
                className={cn(
                  'rounded-[5px] px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === 'guide' ? (
        <ReceptionCleaningGuide
          current={guideQueue.current}
          next={guideQueue.next}
          remainingCount={guideQueue.remainingCount}
          busy={busy}
          bedPresenceByBedId={bedPresenceByBedId}
          presenceByStayId={presenceByStayId}
          onSetBedStatus={onSetBedStatus}
          onSetBedStatuses={onSetBedStatuses}
          onSetPresence={onSetPresence}
          onClearPresence={onClearPresence}
          onSkipRoom={handleSkipRoom}
          onShowAllRooms={() => setViewMode('all')}
        />
      ) : (
        allRoomsContent
      )}
    </div>
  );
}
