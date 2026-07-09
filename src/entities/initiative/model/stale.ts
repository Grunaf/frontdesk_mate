import type { InitiativeFreshness, InitiativeStaleSnapshot } from './types';

const STALE_THRESHOLD = 60;

interface CalculateStaleArgs {
  createdAt: string;
  lastReviewedAt: string | null;
  changesCount: number;
  now?: Date;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveAgeScore(daysSinceReview: number): number {
  if (daysSinceReview <= 7) {
    return 0;
  }
  if (daysSinceReview <= 21) {
    return 15;
  }
  if (daysSinceReview <= 45) {
    return 30;
  }
  return 40;
}

function resolveChurnScore(changesCount: number): number {
  if (changesCount === 0) return 0;
  if (changesCount <= 2) return 5;
  if (changesCount <= 5) return 15;
  if (changesCount > 5) return 25;
  return 0;
}

function resolveFreshness(staleScore: number): InitiativeFreshness {
  if (staleScore >= STALE_THRESHOLD) return 'stale';
  if (staleScore >= 30) return 'warning';
  return 'fresh';
}

function resolveStaleReasons({
  neverReviewed,
  daysSinceReview,
  hasTrackedChanges,
  changesCount,
}: {
  neverReviewed: boolean;
  daysSinceReview: number | null;
  hasTrackedChanges: boolean;
  changesCount: number;
}): string[] {
  const reasons: string[] = [];
  if (neverReviewed) {
    reasons.push('Never reviewed');
  } else if (daysSinceReview !== null && daysSinceReview > 7) {
    reasons.push(`Not reviewed for ${daysSinceReview} days`);
  }
  if (hasTrackedChanges) {
    reasons.push('Tracked paths changed after review');
  }
  if (changesCount > 5) {
    reasons.push(`High code churn after review (${changesCount} changes)`);
  }
  return reasons.slice(0, 5);
}

export function calculateStale({
  createdAt,
  lastReviewedAt,
  changesCount,
  now = new Date(),
}: CalculateStaleArgs): InitiativeStaleSnapshot {
  const referenceTsRaw = lastReviewedAt ?? createdAt;
  const reviewedAt = new Date(referenceTsRaw);
  const reviewDateValid = Number.isFinite(reviewedAt.getTime());
  const daysSinceReview = reviewDateValid
    ? Math.max(0, Math.floor((now.getTime() - reviewedAt.getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  const neverReviewed = lastReviewedAt === null;

  if (daysSinceReview === null) {
    return {
      staleScore: 100,
      isStale: true,
      freshness: 'stale',
      staleReason: ['Not reviewed due to invalid review timestamp'],
      changesCount,
      daysSinceReview: null,
    };
  }

  const ageScore = neverReviewed ? 60 : resolveAgeScore(daysSinceReview);
  const pathChangeScore = changesCount > 0 ? 60 : 0;
  const churnScore = resolveChurnScore(changesCount);
  const staleScore = clamp(ageScore + pathChangeScore + churnScore, 0, 100);
  const freshness = resolveFreshness(staleScore);

  return {
    staleScore,
    isStale: staleScore >= STALE_THRESHOLD,
    freshness,
    staleReason: resolveStaleReasons({
      neverReviewed,
      daysSinceReview,
      hasTrackedChanges: changesCount > 0,
      changesCount,
    }),
    changesCount,
    daysSinceReview,
  };
}

export const buildInitiativeStaleSnapshot = calculateStale;

export { STALE_THRESHOLD };
