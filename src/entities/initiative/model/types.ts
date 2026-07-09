export type InitiativePriority = 'P0' | 'P1' | 'P2';

export type InitiativeStatus = 'idea' | 'planned' | 'in_progress' | 'done' | 'on_hold';

export interface Initiative {
  id: string;
  title: string;
  status: InitiativeStatus;
  priority: InitiativePriority;
  summary: string;
  spec: string;
  trackedPaths: string[];
  relatedFiles: string[];
  tags: string[];
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  staleScore: number;
  isStale: boolean;
  staleReason: string[];
}

export interface InitiativeWarning {
  code: 'invalid_tracked_path_pattern';
  field: 'trackedPaths';
  message: string;
  value: string;
}

export interface InitiativeListInput {
  status?: InitiativeStatus[];
  priority?: InitiativePriority[];
  onlyStale?: boolean;
  search?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface InitiativeListOutput {
  items: Initiative[];
  total: number;
}

export interface CreateInitiativeInput {
  title: string;
  status?: InitiativeStatus;
  priority?: InitiativePriority;
  summary: string;
  spec?: string;
  trackedPaths: string[];
  relatedFiles?: string[];
  tags?: string[];
}

export interface UpdateInitiativePatch {
  title?: string;
  status?: InitiativeStatus;
  priority?: InitiativePriority;
  summary?: string;
  spec?: string;
  trackedPaths?: string[];
  relatedFiles?: string[];
  tags?: string[];
  lastReviewedAt?: string | null;
}

export interface RecalculateInitiativesInput {
  ids?: string[];
  status?: InitiativeStatus[];
  onlyStale?: boolean;
  limit?: number;
}

export type InitiativeFreshness = 'fresh' | 'warning' | 'stale';

export interface InitiativeStaleSnapshot {
  staleScore: number;
  isStale: boolean;
  freshness: InitiativeFreshness;
  staleReason: string[];
  changesCount: number;
  daysSinceReview: number | null;
}

export interface InitiativeListItem extends Initiative, InitiativeStaleSnapshot {}

export type InitiativeErrorCode =
  | 'validation_error'
  | 'payload_too_large'
  | 'not_found'
  | 'db_unavailable'
  | 'internal_error';

export interface InitiativeFieldError {
  field: string;
  message: string;
}

export interface InitiativeErrorPayload {
  code: InitiativeErrorCode;
  message: string;
  fieldErrors: InitiativeFieldError[];
}

export interface InitiativeMutationResult {
  item: InitiativeListItem;
  warnings: InitiativeWarning[];
}
