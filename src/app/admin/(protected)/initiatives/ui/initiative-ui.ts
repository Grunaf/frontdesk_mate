import type { InitiativeFreshness, InitiativePriority, InitiativeStatus } from '@/entities/initiative';

export const PRIORITY_OPTIONS: InitiativePriority[] = ['P0', 'P1', 'P2'];
export const STATUS_OPTIONS: InitiativeStatus[] = ['idea', 'planned', 'in_progress', 'done', 'on_hold'];

export const PRIORITY_ORDER: Record<InitiativePriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
};

export const STATUS_LABELS: Record<InitiativeStatus, string> = {
  idea: 'Idea',
  planned: 'Planned',
  in_progress: 'In progress',
  done: 'Done',
  on_hold: 'On hold',
};

export function resolveFreshnessBadge(freshness: InitiativeFreshness): {
  label: string;
  className: string;
} {
  if (freshness === 'stale') {
    return { label: 'Stale', className: 'border-transparent bg-destructive/10 text-destructive' };
  }
  if (freshness === 'warning') {
    return { label: 'Warning', className: 'border-transparent bg-amber-100 text-amber-900' };
  }
  return { label: 'Fresh', className: 'border-transparent bg-green-100 text-green-800' };
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}
