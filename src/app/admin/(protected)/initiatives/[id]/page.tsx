import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { getInitiativeForAdmin } from '@/entities/initiative/server';
import { markInitiativeAsReviewedAction, recalculateInitiativeAction } from '../actions';
import { formatDateTime, resolveFreshnessBadge, STATUS_LABELS } from '../ui/initiative-ui';

interface InitiativeDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string; updated?: string; recalculated?: string; error?: string }>;
}

export default async function InitiativeDetailPage({ params, searchParams }: InitiativeDetailPageProps) {
  const { id } = await params;
  const { saved, created, updated, recalculated, error: saveError } = await searchParams;
  const { initiative, error } = await getInitiativeForAdmin(id);

  if (!initiative && !error) {
    notFound();
  }

  if (!initiative) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Data error: {error?.message ?? 'Unknown error'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href="/admin/initiatives" className="text-sm text-muted-foreground hover:text-foreground">
            ← Initiatives
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{initiative.title}</h2>
            <Badge variant="outline">{initiative.priority}</Badge>
            <Badge variant="muted">{STATUS_LABELS[initiative.status]}</Badge>
            <Badge className={resolveFreshnessBadge(initiative.freshness).className}>
              {resolveFreshnessBadge(initiative.freshness).label}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/initiatives/${initiative.id}/edit`}>Edit</Link>
          </Button>
          <form action={recalculateInitiativeAction}>
            <input type="hidden" name="id" value={initiative.id} />
            <Button type="submit" variant="outline">
              Recalculate stale
            </Button>
          </form>
          <form action={markInitiativeAsReviewedAction}>
            <input type="hidden" name="id" value={initiative.id} />
            <Button type="submit">Mark as reviewed</Button>
          </form>
        </div>
      </div>

      {saved === '1' ? <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">Review timestamp updated.</p> : null}
      {created === '1' ? <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">Initiative created.</p> : null}
      {updated === '1' ? <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">Initiative updated.</p> : null}
      {recalculated === '1' ? <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">Stale score recalculated.</p> : null}
      {saveError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {decodeURIComponent(saveError)}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-background p-4 text-sm">
          <p className="text-muted-foreground">Freshness meta</p>
          <p className="mt-1 text-2xl font-semibold">{initiative.staleScore}</p>
          <p className="mt-2 text-muted-foreground">
            Last reviewed: <span className="text-foreground">{formatDateTime(initiative.lastReviewedAt)}</span>
          </p>
          <p className="text-muted-foreground">
            Updated: <span className="text-foreground">{formatDateTime(initiative.updatedAt)}</span>
          </p>
          <p className="text-muted-foreground">
            Changes in tracked paths: <span className="text-foreground">{initiative.changesCount}</span>
          </p>
        </div>
        <div className="rounded-xl border bg-background p-4 text-sm">
          <p className="font-medium">Summary</p>
          <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{initiative.summary}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <h3 className="text-sm font-medium">Why stale</h3>
        {initiative.staleReason.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No stale reasons — initiative is currently fresh.</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {initiative.staleReason.map((reason) => (
              <li key={reason}>{reason}</li>
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
    </div>
  );
}
