'use client';

import { cn } from '@/shared/lib/utils';
import type { ReceptionPrimaryNav } from '../lib/receptionDeskAccess';

const PRIMARY_LABELS: Record<ReceptionPrimaryNav, string> = {
  today: 'Today',
  bookings: 'Bookings',
  more: 'More',
  cleaning: 'Cleaning',
};

interface ReceptionBottomNavProps {
  items: readonly ReceptionPrimaryNav[];
  active: ReceptionPrimaryNav;
  moreBadgeCount?: number;
  onSelect: (item: ReceptionPrimaryNav) => void;
}

export function ReceptionBottomNav({
  items,
  active,
  moreBadgeCount = 0,
  onSelect,
}: ReceptionBottomNavProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Reception primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/95',
        'pb-[env(safe-area-inset-bottom,0px)] backdrop-blur supports-[backdrop-filter]:bg-background/90'
      )}
    >
      <div className="mx-auto flex max-w-3xl items-stretch">
        {items.map((item) => {
          const isActive = item === active;
          const showBadge = item === 'more' && moreBadgeCount > 0;
          return (
            <button
              key={item}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelect(item)}
              className={cn(
                'relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2',
                'text-xs font-medium transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="relative inline-flex items-center">
                {PRIMARY_LABELS[item]}
                {showBadge ? (
                  <span
                    aria-label={`${moreBadgeCount} open`}
                    className={cn(
                      'ml-1 inline-flex min-w-5 items-center justify-center rounded-full',
                      'bg-destructive px-1 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground'
                    )}
                  >
                    {moreBadgeCount > 99 ? '99+' : moreBadgeCount}
                  </span>
                ) : null}
              </span>
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Bottom padding so page content clears the fixed bottom nav. */
export const RECEPTION_BOTTOM_NAV_CONTENT_PAD =
  'pb-[calc(4rem+env(safe-area-inset-bottom,0px))]';
