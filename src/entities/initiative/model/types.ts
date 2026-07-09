export type InitiativePriority = 'P0' | 'P1' | 'P2';

export type InitiativeStatus = 'idea' | 'planned' | 'in_progress' | 'done' | 'on_hold';

export type InitiativeStaleReason = 'review_age' | 'tracked_changes' | 'high_churn';

export type InitiativeFreshness = 'fresh' | 'warning' | 'stale';

export interface InitiativeCard {
  id: string;
  title: string;
  priority: InitiativePriority;
  status: InitiativeStatus;
  summary: string;
  spec: string;
  trackedPaths: string[];
  lastReviewedAt: string | null;
}

export interface InitiativeStaleSnapshot {
  staleScore: number;
  isStale: boolean;
  freshness: InitiativeFreshness;
  staleReason: InitiativeStaleReason[];
  changedFilesCount: number;
  daysSinceReview: number | null;
}

export interface InitiativeListItem extends InitiativeCard, InitiativeStaleSnapshot {}
