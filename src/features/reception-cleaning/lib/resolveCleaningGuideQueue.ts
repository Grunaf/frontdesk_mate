import { resolveRoomBedBatchAction } from '@/entities/housekeeping';

import type { CleaningRoomBucket } from './resolveCleaningHubSnapshot';

export type CleaningGuideQueue = {
  current: CleaningRoomBucket | null;
  next: CleaningRoomBucket | null;
  remainingCount: number;
};

export type ResolveCleaningGuideQueueOptions = {
  /** Session-only room ids deferred to the end of the queue (Skip room). */
  skippedRoomIds?: readonly string[];
};

function roomIsGuideEligible(room: CleaningRoomBucket): boolean {
  return resolveRoomBedBatchAction(room.beds) !== null || room.beds.length > 0;
}

/**
 * Reorder todo rooms so session-skipped ids move to the end.
 * Relative order among active rooms is preserved; skipped rooms follow `skippedRoomIds` order.
 */
export function applyCleaningGuideSkipOrder(
  todoRooms: readonly CleaningRoomBucket[],
  skippedRoomIds: readonly string[] = []
): CleaningRoomBucket[] {
  if (skippedRoomIds.length === 0) return [...todoRooms];

  const skippedSet = new Set(skippedRoomIds);
  const active: CleaningRoomBucket[] = [];
  const deferredById = new Map<string, CleaningRoomBucket>();

  for (const room of todoRooms) {
    if (skippedSet.has(room.roomId)) {
      deferredById.set(room.roomId, room);
    } else {
      active.push(room);
    }
  }

  const deferred: CleaningRoomBucket[] = [];
  for (const roomId of skippedRoomIds) {
    const room = deferredById.get(roomId);
    if (room) {
      deferred.push(room);
      deferredById.delete(roomId);
    }
  }
  for (const room of deferredById.values()) {
    deferred.push(room);
  }

  return [...active, ...deferred];
}

/**
 * Guide queue from already-sorted `todoRooms` (Today → Tomorrow → rest).
 * Current = first eligible room after session skip reorder.
 */
export function resolveCleaningGuideQueue(
  todoRooms: readonly CleaningRoomBucket[],
  options: ResolveCleaningGuideQueueOptions = {}
): CleaningGuideQueue {
  const ordered = applyCleaningGuideSkipOrder(todoRooms, options.skippedRoomIds ?? []).filter(
    roomIsGuideEligible
  );

  const current = ordered[0] ?? null;
  const next = ordered[1] ?? null;

  return {
    current,
    next,
    remainingCount: ordered.length,
  };
}
