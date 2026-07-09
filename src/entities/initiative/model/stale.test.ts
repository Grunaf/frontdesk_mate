import { describe, expect, it } from 'vitest';
import { calculateStale } from './stale';

describe('initiative stale calculation', () => {
  it('marks never reviewed initiative as stale', () => {
    const snapshot = calculateStale({
      createdAt: '2026-01-01T00:00:00.000Z',
      lastReviewedAt: null,
      changesCount: 0,
      now: new Date('2026-01-10T00:00:00.000Z'),
    });

    expect(snapshot.isStale).toBe(true);
    expect(snapshot.staleScore).toBe(60);
    expect(snapshot.staleReason).toContain('Never reviewed');
  });

  it('marks reviewed unchanged initiative as fresh', () => {
    const snapshot = calculateStale({
      createdAt: '2026-01-01T00:00:00.000Z',
      lastReviewedAt: '2026-01-09T00:00:00.000Z',
      changesCount: 0,
      now: new Date('2026-01-10T00:00:00.000Z'),
    });

    expect(snapshot.isStale).toBe(false);
    expect(snapshot.freshness).toBe('fresh');
    expect(snapshot.staleReason).toHaveLength(0);
  });

  it('returns hard stale snapshot for invalid reviewed timestamp', () => {
    const snapshot = calculateStale({
      createdAt: '2026-01-01T00:00:00.000Z',
      lastReviewedAt: 'invalid-date',
      changesCount: 2,
      now: new Date('2026-01-10T00:00:00.000Z'),
    });

    expect(snapshot.isStale).toBe(true);
    expect(snapshot.staleScore).toBe(100);
    expect(snapshot.staleReason).toEqual(['Not reviewed due to invalid review timestamp']);
  });
});
