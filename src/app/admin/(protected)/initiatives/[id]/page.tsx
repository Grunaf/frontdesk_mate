import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/shared/ui/badge';
import type { InitiativeStaleReason } from '@/entities/initiative';
import { getInitiativeForAdmin } from '@/entities/initiative/server';
import { MarkAsReviewedButton } from '@/features/initiative-review';
import { markInitiativeAsReviewedAction } from '../actions';

const REASON_LABELS: Record<InitiativeStaleReason, string> = {
  review_age: 'Review age is high',
  tracked_changes: 'Tracked paths changed after review',
  high_churn: 'High code churn in tracked paths',
};

function formatReviewedAt(value: string | null): string {
  if (!value) return 'Not reviewed yet';
  try {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

interface InitiativeDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}

export default async function InitiativeDetailPage({ params, searchParams }: InitiativeDetailPageProps) {
  const { id } = await params;
  const { saved, error: saveError } = await searchParams;
  const { initiative, error } = await getInitiativeForAdmin(id);

  if (!initiative && !error) {
    notFound();
  }

  if (!initiative) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Data error: {error ?? 'Unknown error'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/admin/initiatives" className="text-sm text-muted-foreground hover:text-foreground">
          ← Initiatives
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{initiative.title}</h2>
          <Badge variant="outline">{initiative.priority}</Badge>
          <Badge variant="muted">{initiative.status}</Badge>
          <Badge className={initiative.isStale ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-800'}>
            {initiative.isStale ? 'Stale' : initiative.freshness === 'warning' ? 'Warning' : 'Fresh'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{initiative.summary}</p>
      </div>

      {saved === '1' ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Review timestamp updated.
        </p>
      ) : null}
      {saveError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {decodeURIComponent(saveError)}
        </p>
      ) : null}

      <div className="rounded-xl border bg-background p-4 text-sm">
        <p className="text-muted-foreground">Stale score</p>
        <p className="text-2xl font-semibold">{initiative.staleScore}</p>
        <p className="mt-2 text-muted-foreground">
          Last reviewed: <span className="text-foreground">{formatReviewedAt(initiative.lastReviewedAt)}</span>
        </p>
        <p className="text-muted-foreground">
          Changed files in tracked paths: <span className="text-foreground">{initiative.changedFilesCount}</span>
        </p>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <h3 className="text-sm font-medium">Why stale</h3>
        {initiative.staleReason.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No stale reasons — initiative is currently fresh.</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {initiative.staleReason.map((reason) => (
              <li key={reason}>{REASON_LABELS[reason]}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border bg-background p-4">
        <h3 className="text-sm font-medium">Spec</h3>
        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{initiative.spec}</p>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <h3 className="text-sm font-medium">Tracked paths</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {initiative.trackedPaths.map((trackedPath) => (
            <li key={trackedPath}>
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{trackedPath}</code>
            </li>
          ))}
        </ul>
      </div>

      <MarkAsReviewedButton id={initiative.id} action={markInitiativeAsReviewedAction} />
    </div>
  );
}
