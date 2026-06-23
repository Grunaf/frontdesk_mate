'use client';

import type { BedInventoryRoomGroup } from '../lib/resolveBedInventory';
import { cn } from '@/shared/lib/utils';

interface BedInventoryGridProps {
  roomGroups: BedInventoryRoomGroup[];
  onViewOccupiedStay: (stayId: string) => void;
  compact?: boolean;
}

function formatAccessFrom(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function BedInventoryGrid({
  roomGroups,
  onViewOccupiedStay,
  compact = true,
}: BedInventoryGridProps) {
  const allBeds = roomGroups.flatMap((group) => group.beds);
  if (allBeds.length === 0) {
    return <p className="text-xs text-muted-foreground">No beds configured.</p>;
  }

  if (!compact) {
    const freeCount = allBeds.filter((entry) => entry.status === 'free').length;
    const occupiedCount = allBeds.length - freeCount;

    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {freeCount} free · {occupiedCount} in use
        </p>
        {roomGroups.map((group) => (
          <section key={group.roomId} className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.roomLabel}
            </h4>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.beds.map((entry) => (
                <li key={entry.bedId}>
                  {entry.status === 'free' ? (
                    <div className="rounded-lg border bg-muted/10 px-3 py-2 text-sm">
                      <span className="font-medium">{entry.displayLabel}</span>
                      <p className="text-xs text-muted-foreground">Free</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => entry.stay && onViewOccupiedStay(entry.stay.id)}
                      className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/30"
                    >
                      <span className="font-medium">{entry.displayLabel}</span>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.stay?.guest_name || 'In use'}
                      </p>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {roomGroups.map((group) => (
        <section key={group.roomId} className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {group.roomLabel}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.beds.map((entry) => {
              const isFree = entry.status === 'free';

              if (isFree) {
                return (
                  <span
                    key={entry.bedId}
                    title={
                      entry.nextAccess
                        ? `Access from ${formatAccessFrom(entry.nextAccess.check_in_at)}`
                        : entry.bedId
                    }
                    className="inline-flex h-8 items-center rounded-full border bg-muted/10 px-2.5 text-xs text-muted-foreground"
                  >
                    {entry.displayLabel} · Free
                  </span>
                );
              }

              return (
                <button
                  key={entry.bedId}
                  type="button"
                  onClick={() => entry.stay && onViewOccupiedStay(entry.stay.id)}
                  className={cn(
                    'inline-flex h-8 max-w-full items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 text-xs font-medium',
                    'truncate hover:bg-primary/15'
                  )}
                >
                  {entry.stay?.guest_name || entry.displayLabel}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
