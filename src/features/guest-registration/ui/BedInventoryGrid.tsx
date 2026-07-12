'use client';

import { formatStayCalendarDayLabel, stayRecordCheckInDate } from '@/entities/guest-stay';
import type { BedInventoryRoomGroup } from '../lib/resolveBedInventory';
import type { BedNightCellStatus } from '@/entities/guest-stay/lib/guestAccessIntervals';
import { cn } from '@/shared/lib/utils';

interface BedInventoryGridProps {
  roomGroups: BedInventoryRoomGroup[];
  onViewOccupiedStay: (stayId: string) => void;
  compact?: boolean;
}

function formatStayNightFrom(stay: {
  check_in_at: string;
  check_in_date?: string | null;
}): string {
  const day = stayRecordCheckInDate(stay);
  return formatStayCalendarDayLabel(day, 'en') ?? day;
}

function occupiedStatusLabel(nightCellStatus?: BedNightCellStatus): string {
  return nightCellStatus === 'scheduled' ? 'Scheduled' : 'In use';
}

function occupiedChipClassName(nightCellStatus?: BedNightCellStatus): string {
  if (nightCellStatus === 'scheduled') {
    return 'border-amber-200/80 bg-amber-50 text-amber-950 hover:bg-amber-100/80';
  }
  return 'border-primary/20 bg-primary/10 hover:bg-primary/15';
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
          {freeCount} free · {occupiedCount} reserved this night
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
                      {entry.nextAccess ? (
                        <p className="text-xs text-muted-foreground">
                          Stay from {formatStayNightFrom(entry.nextAccess)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => entry.stay && onViewOccupiedStay(entry.stay.id)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/30',
                        entry.nightCellStatus === 'scheduled' && 'border-amber-200/80 bg-amber-50'
                      )}
                    >
                      <span className="font-medium">{entry.displayLabel}</span>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.stay?.guest_name || occupiedStatusLabel(entry.nightCellStatus)}
                      </p>
                      {entry.nightCellStatus === 'scheduled' ? (
                        <p className="text-[11px] text-amber-900/80">{occupiedStatusLabel('scheduled')}</p>
                      ) : null}
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
                        ? `Stay from ${formatStayNightFrom(entry.nextAccess)}`
                        : entry.bedId
                    }
                    className="inline-flex h-8 items-center rounded-full border bg-muted/10 px-2.5 text-xs text-muted-foreground"
                  >
                    {entry.displayLabel} · Free
                  </span>
                );
              }

              const guestLabel = entry.stay?.guest_name || entry.displayLabel;
              const title =
                entry.nightCellStatus === 'scheduled' && entry.stay
                  ? `${guestLabel} · check-in ${formatStayNightFrom(entry.stay)}`
                  : guestLabel;

              return (
                <button
                  key={entry.bedId}
                  type="button"
                  title={title}
                  onClick={() => entry.stay && onViewOccupiedStay(entry.stay.id)}
                  className={cn(
                    'inline-flex h-8 max-w-full items-center rounded-full border px-2.5 text-xs font-medium truncate',
                    occupiedChipClassName(entry.nightCellStatus)
                  )}
                >
                  {guestLabel}
                  {entry.nightCellStatus === 'scheduled' ? (
                    <span className="ml-1 font-normal opacity-80">· Soon</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
