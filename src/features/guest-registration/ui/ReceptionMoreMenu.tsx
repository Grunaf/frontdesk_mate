'use client';

import { cn } from '@/shared/lib/utils';
import {
  groupMoreMenuTabs,
  type MoreMenuTab,
} from '../lib/receptionDeskAccess';

const MORE_LABELS: Record<MoreMenuTab, string> = {
  access: 'Access',
  cash: 'Cash',
  schedule: 'My schedule',
  issues: 'Issues',
  transfers: 'Transfers',
  cleaning: 'Cleaning',
  wash: 'Wash',
};

interface ReceptionMoreMenuProps {
  items: readonly MoreMenuTab[];
  openIssuesCount: number;
  openTransfersCount: number;
  onSelect: (tab: MoreMenuTab) => void;
}

function itemCount(
  item: MoreMenuTab,
  openIssuesCount: number,
  openTransfersCount: number
): number {
  if (item === 'issues') return openIssuesCount;
  if (item === 'transfers') return openTransfersCount;
  return 0;
}

export function ReceptionMoreMenu({
  items,
  openIssuesCount,
  openTransfersCount,
  onSelect,
}: ReceptionMoreMenuProps) {
  const groups = groupMoreMenuTabs(items);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No additional sections.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">More</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Tools and inboxes.</p>
      </div>
      {groups.map((group) => (
        <section key={group.id} className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h3>
          <ul className="divide-y divide-border/80 overflow-hidden rounded-lg border bg-card">
            {group.items.map((item) => {
              const count = itemCount(item, openIssuesCount, openTransfersCount);
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
        </section>
      ))}
    </div>
  );
}
