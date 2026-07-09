import type { InitiativeFreshness, InitiativeStaleReason, InitiativeStaleSnapshot } from './types';

const STALE_THRESHOLD = 60;

interface BuildInitiativeStaleSnapshotArgs {
  lastReviewedAt: string | null;
  changedFilesCount: number;
  now?: Date;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveAgeScore(daysSinceReview: number): number {
  if (daysSinceReview <= 3) {
    return 0;
  }
  const normalized = (daysSinceReview - 3) / (21 - 3);
  return Math.round(clamp(normalized, 0, 1) * 40);
}

function resolveChurnScore(changedFilesCount: number): number {
  if (changedFilesCount >= 6) return 20;
  if (changedFilesCount >= 3) return 10;
  return 0;
}

function resolveFreshness(staleScore: number): InitiativeFreshness {
  if (staleScore >= STALE_THRESHOLD) return 'stale';
  if (staleScore >= 30) return 'warning';
  return 'fresh';
}

function resolveStaleReasons(daysSinceReview: number | null, changedFilesCount: number): InitiativeStaleReason[] {
  const reasons: InitiativeStaleReason[] = [];
  if (daysSinceReview === null || daysSinceReview > 14) {
    reasons.push('review_age');
  }
  if (changedFilesCount > 0) {
    reasons.push('tracked_changes');
  }
  if (changedFilesCount >= 6) {
    reasons.push('high_churn');
  }
  return reasons;
}

export function buildInitiativeStaleSnapshot({
  lastReviewedAt,
  changedFilesCount,
  now = new Date(),
}: BuildInitiativeStaleSnapshotArgs): InitiativeStaleSnapshot {
  if (!lastReviewedAt) {
    return {
      staleScore: 100,
      isStale: true,
      freshness: 'stale',
      staleReason: ['review_age'],
      changedFilesCount,
      daysSinceReview: null,
    };
  }

  const reviewedAt = new Date(lastReviewedAt);
  const reviewDateValid = Number.isFinite(reviewedAt.getTime());
  const daysSinceReview = reviewDateValid
    ? Math.max(0, Math.floor((now.getTime() - reviewedAt.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  if (daysSinceReview === null) {
    return {
      staleScore: 100,
      isStale: true,
      freshness: 'stale',
      staleReason: ['review_age'],
      changedFilesCount,
      daysSinceReview: null,
    };
  }

  const ageScore = resolveAgeScore(daysSinceReview);
  const changeScore = changedFilesCount > 0 ? 40 : 0;
  const churnScore = resolveChurnScore(changedFilesCount);
  const staleScore = ageScore + changeScore + churnScore;
  const freshness = resolveFreshness(staleScore);

  return {
    staleScore,
    isStale: staleScore >= STALE_THRESHOLD,
    freshness,
    staleReason: resolveStaleReasons(daysSinceReview, changedFilesCount),
    changedFilesCount,
    daysSinceReview,
  };
}

export { STALE_THRESHOLD };
