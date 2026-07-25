import { describe, expect, it } from 'vitest';

import type { CleaningRoomBucket } from './resolveCleaningHubSnapshot';
import {
  applyCleaningGuideSkipOrder,
  resolveCleaningGuideQueue,
} from './resolveCleaningGuideQueue';

function room(
  roomId: string,
  roomLabel: string,
  beds: CleaningRoomBucket['beds']
): CleaningRoomBucket {
  return { roomId, roomLabel, roomStatus: undefined, beds };
}

const dormA = room('r1', 'Dorm A', [
  { bedId: 'b1', displayLabel: 'A1', status: 'needs_strip' },
]);
const dormB = room('r2', 'Dorm B', [
  { bedId: 'b2', displayLabel: 'B1', status: 'stripped' },
]);
const dormC = room('r3', 'Dorm C', [
  { bedId: 'b3', displayLabel: 'C1', status: 'needs_strip' },
  { bedId: 'b4', displayLabel: 'C2', status: 'stripped' },
]);

describe('applyCleaningGuideSkipOrder', () => {
  it('returns a copy when nothing skipped', () => {
    const result = applyCleaningGuideSkipOrder([dormA, dormB, dormC]);
    expect(result.map((r) => r.roomId)).toEqual(['r1', 'r2', 'r3']);
  });

  it('moves skipped rooms to the end in skip order', () => {
    const result = applyCleaningGuideSkipOrder([dormA, dormB, dormC], ['r1', 'r2']);
    expect(result.map((r) => r.roomId)).toEqual(['r3', 'r1', 'r2']);
  });
});

describe('resolveCleaningGuideQueue', () => {
  it('picks the first todo room as current and peeks the next', () => {
    const queue = resolveCleaningGuideQueue([dormA, dormB, dormC]);
    expect(queue.current?.roomId).toBe('r1');
    expect(queue.next?.roomId).toBe('r2');
    expect(queue.remainingCount).toBe(3);
  });

  it('applies session skip before selecting current', () => {
    const queue = resolveCleaningGuideQueue([dormA, dormB, dormC], {
      skippedRoomIds: ['r1'],
    });
    expect(queue.current?.roomId).toBe('r2');
    expect(queue.next?.roomId).toBe('r3');
    expect(queue.remainingCount).toBe(3);
  });

  it('returns empty queue when no todo rooms', () => {
    expect(resolveCleaningGuideQueue([])).toEqual({
      current: null,
      next: null,
      remainingCount: 0,
    });
  });

  it('returns null next when only one room remains', () => {
    const queue = resolveCleaningGuideQueue([dormB], { skippedRoomIds: ['r1'] });
    expect(queue.current?.roomId).toBe('r2');
    expect(queue.next).toBeNull();
    expect(queue.remainingCount).toBe(1);
  });
});
