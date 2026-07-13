'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { GuestIssueRecord } from '@/entities/guest-issue';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import { listGuestIssuesAction, resolveGuestIssueAction } from '@/features/guest-issue-report';
import { Button, SegmentedChipBar } from '@/shared/ui';

const FILTER_ITEMS = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
] as const;

type IssuesFilter = (typeof FILTER_ITEMS)[number]['id'];

const CATEGORY_LABELS: Record<GuestIssueRecord['category'], string> = {
  shower: 'Shower',
  toilet: 'Toilet',
  door_lock: 'Door lock',
  bed: 'Bed',
  wifi: 'Wi-Fi',
  other: 'Other',
};

interface IssuesListProps {
  tenantSlug: string;
  openIssues: GuestIssueRecord[];
  onFocusStay: (stayId: string) => void;
  isActive: boolean;
  onOperationalRefresh: () => Promise<unknown>;
}

export function IssuesList({
  tenantSlug,
  openIssues,
  onFocusStay,
  isActive,
  onOperationalRefresh,
}: IssuesListProps) {
  const [filter, setFilter] = useState<IssuesFilter>('open');
  const [doneIssues, setDoneIssues] = useState<GuestIssueRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadDoneIssues = useCallback(async () => {
    const updated = await listGuestIssuesAction(tenantSlug, 'done');
    setDoneIssues(updated);
  }, [tenantSlug]);

  const issues = filter === 'open' ? openIssues : doneIssues;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    void onOperationalRefresh();

    const interval = window.setInterval(() => {
      void onOperationalRefresh();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [isActive, onOperationalRefresh]);

  useEffect(() => {
    if (filter === 'done' && isActive) {
      void loadDoneIssues();
    }
  }, [filter, isActive, loadDoneIssues]);

  const handleFilterChange = (nextFilter: string) => {
    const resolved = nextFilter as IssuesFilter;
    setFilter(resolved);
    if (resolved === 'done') {
      void loadDoneIssues();
    }
  };

  const handleResolve = (issueId: string) => {
    setError(null);

    startTransition(async () => {
      const result = await resolveGuestIssueAction({ tenantSlug, issueId });
      if (!result.ok) {
        setError(result.error === 'not_found' ? 'Issue not found.' : 'Could not mark issue done.');
        return;
      }

      await onOperationalRefresh();
      if (filter === 'done') {
        await loadDoneIssues();
      }
    });
  };

  return (
    <div className="space-y-3">
      <SegmentedChipBar
        items={[...FILTER_ITEMS]}
        value={filter}
        onValueChange={handleFilterChange}
        ariaLabel="Issue status"
        bleed={false}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {issues.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {filter === 'open' ? 'No open issues.' : 'No resolved issues yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {issues.map((issue) => {
            const stayRef = formatStayReference(issue.stay_id);
            const categoryLabel = CATEGORY_LABELS[issue.category] ?? issue.category;
            const relativeTime = formatDistanceToNow(new Date(issue.created_at), { addSuffix: true });

            return (
              <li key={issue.id} className="rounded-lg border bg-background px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <button
                      type="button"
                      className="text-left text-sm font-medium text-foreground hover:underline"
                      onClick={() => onFocusStay(issue.stay_id)}
                    >
                      {categoryLabel} · {issue.bed_id}
                      {stayRef ? <span className="font-mono text-muted-foreground"> · #{stayRef}</span> : null}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {relativeTime}
                      {issue.note ? ` · “${issue.note}”` : ''}
                    </p>
                    {issue.guest_name ? (
                      <p className="text-xs text-muted-foreground/80">{issue.guest_name}</p>
                    ) : null}
                  </div>

                  {issue.status === 'open' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={isPending}
                      onClick={() => handleResolve(issue.id)}
                    >
                      Mark done
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
