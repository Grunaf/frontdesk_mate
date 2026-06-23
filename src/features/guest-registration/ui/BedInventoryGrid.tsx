'use client';

import type { BedInventoryEntry } from '../lib/resolveBedInventory';
import { Badge } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

interface BedInventoryGridProps {
  beds: BedInventoryEntry[];
  selectedBedId?: string;
  onSelectFreeBed: (bedId: string) => void;
  onViewOccupiedStay: (stayId: string) => void;
}

export function BedInventoryGrid({
  beds,
  selectedBedId,
  onSelectFreeBed,
  onViewOccupiedStay,
}: BedInventoryGridProps) {
  if (beds.length === 0) {
    return null;
  }

  const freeCount = beds.filter((entry) => entry.status === 'free').length;
  const occupiedCount = beds.length - freeCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Bed inventory</h3>
          <p className="text-xs text-muted-foreground">
            {freeCount} free · {occupiedCount} occupied
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {beds.map((entry) => {
          const isSelected = entry.bedId === selectedBedId;
          const isFree = entry.status === 'free';

          return (
            <li key={entry.bedId}>
              <button
                type="button"
                onClick={() => {
                  if (isFree) {
                    onSelectFreeBed(entry.bedId);
                    return;
                  }
                  if (entry.stay) {
                    onViewOccupiedStay(entry.stay.id);
                  }
                }}
                className={cn(
                  'flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  isFree && 'hover:border-primary/40 hover:bg-muted/40',
                  isSelected && 'border-primary bg-primary/5',
                  !isFree && 'cursor-pointer hover:bg-muted/30'
                )}
              >
                <span className="font-medium">{entry.bedId}</span>
                {isFree ? (
                  <Badge variant="outline">Free</Badge>
                ) : (
                  <>
                    <Badge variant="secondary">Occupied</Badge>
                    {entry.stay?.guest_name ? (
                      <span className="truncate text-xs text-muted-foreground">{entry.stay.guest_name}</span>
                    ) : null}
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
