'use client';

import { cn } from '@/shared/lib/utils';
import type { MoreMenuTab } from '../lib/receptionDeskAccess';

const MORE_LABELS: Record<MoreMenuTab, string> = {
  issues: 'Issues',
  transfers: 'Transfers',
  archive: 'Archive',
  cleaning: 'Cleaning',
};

interface ReceptionMoreMenuProps {
  items: readonly MoreMenuTab[];
  openIssuesCount: number;
  openTransfersCount: number;
  onSelect: (tab: MoreMenuTab) => void;
}

export function ReceptionMoreMenu({
  items,
  openIssuesCount,
  openTransfersCount,
  onSelect,
}: ReceptionMoreMenuProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No additional sections.</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">More</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Issues, transfers, and utilities.</p>
      </div>
      <ul className="divide-y divide-border/80 overflow-hidden rounded-lg border bg-card">
        {items.map((item) => {
          const count =
            item === 'issues' ? openIssuesCount : item === 'transfers' ? openTransfersCount : 0;
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm',
                  'hover:bg-muted/40'
                )}
              >
                <span className="font-medium text-foreground">{MORE_LABELS[item]}</span>
                {count > 0 ? (
                  <span className="tabular-nums text-xs font-medium text-muted-foreground">
                    {count}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground" aria-hidden>
                    →
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
