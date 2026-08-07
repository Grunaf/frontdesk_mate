'use client';

import { Archive, Inbox } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

interface ReceptionPlanBookingShortcutsProps {
  openBookingInboxCount: number;
  onOpenBookingInbox: () => void;
  onOpenArchive: () => void;
  className?: string;
}

/** Plan tool-panel shortcuts — desktop (`lg+`); mobile uses FAB speed-dial. */
export function ReceptionPlanBookingShortcuts({
  openBookingInboxCount,
  onOpenBookingInbox,
  onOpenArchive,
  className,
}: ReceptionPlanBookingShortcutsProps) {
  return (
    <div className={cn('flex items-center justify-end gap-1', className)}>
      <Button
        type="button"
        size="icon-lg"
        variant="ghost"
        className="relative shrink-0"
        aria-label="Booking.com inbox"
        onClick={onOpenBookingInbox}
      >
        <Inbox aria-hidden />
        {openBookingInboxCount > 0 ? (
          <span
            aria-label={`${openBookingInboxCount} open`}
            className={cn(
              'absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full',
              'bg-destructive px-1 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground'
            )}
          >
            {openBookingInboxCount > 99 ? '99+' : openBookingInboxCount}
          </span>
        ) : null}
      </Button>
      <Button
        type="button"
        size="icon-lg"
        variant="ghost"
        className="shrink-0"
        aria-label="Archive"
        onClick={onOpenArchive}
      >
        <Archive aria-hidden />
      </Button>
    </div>
  );
}
