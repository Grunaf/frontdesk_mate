'use client';

import type { BedInventoryRoomGroup } from '../lib/resolveBedInventory';
import { Badge } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

interface BedInventoryGridProps {
  roomGroups: BedInventoryRoomGroup[];
  onViewOccupiedStay: (stayId: string) => void;
}

function formatAccessFrom(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function BedInventoryGrid({ roomGroups, onViewOccupiedStay }: BedInventoryGridProps) {
  const allBeds = roomGroups.flatMap((group) => group.beds);
  if (allBeds.length === 0) {
    return null;
  }

  const freeCount = allBeds.filter((entry) => entry.status === 'free').length;
  const occupiedCount = allBeds.length - freeCount;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Bed inventory</h3>
        <p className="text-xs text-muted-foreground">
          Who is in the hostel now. Use the form below to issue access for any date range. {freeCount}{' '}
          free · {occupiedCount} in use
        </p>
      </div>

      {roomGroups.map((group) => (
        <section key={group.roomId} className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group.roomLabel}
          </h4>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {group.beds.map((entry) => {
              const isFree = entry.status === 'free';

              return (
                <li key={entry.bedId}>
                  {isFree ? (
                    <div className="flex w-full flex-col items-start gap-1 rounded-lg border bg-muted/10 px-3 py-2 text-sm">
                      <span className="font-medium">{entry.displayLabel}</span>
                      <Badge variant="outline">Free</Badge>
                      {entry.nextAccess ? (
                        <span className="text-xs text-muted-foreground">
                          Access from {formatAccessFrom(entry.nextAccess.check_in_at)}
                        </span>
                      ) : (
                        <span className="truncate text-xs text-muted-foreground">{entry.bedId}</span>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => entry.stay && onViewOccupiedStay(entry.stay.id)}
                      className={cn(
                        'flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        'cursor-pointer hover:bg-muted/30'
                      )}
                    >
                      <span className="font-medium">{entry.displayLabel}</span>
                      <Badge variant="secondary">In use</Badge>
                      {entry.stay?.guest_name ? (
                        <span className="truncate text-xs text-muted-foreground">{entry.stay.guest_name}</span>
                      ) : (
                        <span className="truncate text-xs text-muted-foreground">{entry.bedId}</span>
                      )}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
