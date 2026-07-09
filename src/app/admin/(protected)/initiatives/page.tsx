import Link from 'next/link';
import { Badge } from '@/shared/ui/badge';
import { listInitiativesForAdmin } from '@/entities/initiative/server';
import type { InitiativeFreshness, InitiativePriority, InitiativeStatus } from '@/entities/initiative';
import { recalculateInitiativesAction } from './actions';

const PRIORITY_ORDER: Record<InitiativePriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
};

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  idea: 'Idea',
  planned: 'Planned',
  in_progress: 'In progress',
  done: 'Done',
  on_hold: 'On hold',
};

function freshnessBadge(freshness: InitiativeFreshness) {
  if (freshness === 'stale') return { label: 'Stale', className: 'bg-destructive/10 text-destructive' };
  if (freshness === 'warning') return { label: 'Warning', className: 'bg-amber-100 text-amber-900' };
  return { label: 'Fresh', className: 'bg-green-100 text-green-800' };
}

function formatReviewedAt(value: string | null): string {
  if (!value) return 'Not reviewed';
  try {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

interface AdminInitiativesPageProps {
  searchParams: Promise<{ stale?: string }>;
}

export default async function AdminInitiativesPage({ searchParams }: AdminInitiativesPageProps) {
  const { stale } = await searchParams;
  const onlyStale = stale === '1';
  const { rows, error } = await listInitiativesForAdmin(onlyStale);
  const sorted = [...rows].sort((a, b) => {
    if (a.isStale !== b.isStale) return a.isStale ? -1 : 1;
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Initiatives</h2>
          <p className="text-sm text-muted-foreground">
            Track drafts and detect when implementation drift makes specs stale.
          </p>
        </div>
        <form action={recalculateInitiativesAction}>
          <button type="submit" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/50">
            Recalculate
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/initiatives"
          className={`rounded-md px-3 py-1.5 text-sm ${onlyStale ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}
        >
          All
        </Link>
        <Link
          href="/admin/initiatives?stale=1"
          className={`rounded-md px-3 py-1.5 text-sm ${onlyStale ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          Only stale
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Data error: {error.message}
        </p>
      ) : null}

      <ul className="divide-y rounded-xl border bg-background">
        {!error && sorted.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">No initiatives in this view.</li>
        ) : null}
        {sorted.map((initiative) => {
          const freshness = freshnessBadge(initiative.freshness);
          return (
            <li key={initiative.id}>
              <Link
                href={`/admin/initiatives/${initiative.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{initiative.title}</p>
                    <Badge variant="outline">{initiative.priority}</Badge>
                    <Badge variant="muted">{STATUS_LABELS[initiative.status]}</Badge>
                    <Badge className={freshness.className}>{freshness.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{initiative.summary}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <p>Reviewed</p>
                  <p>{formatReviewedAt(initiative.lastReviewedAt)}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
