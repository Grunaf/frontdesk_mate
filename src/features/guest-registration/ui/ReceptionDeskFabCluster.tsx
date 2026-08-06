'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Archive, Inbox, MoreHorizontal } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { ReceptionIssueAccessFab } from './ReceptionIssueAccessFab';
import {
  RECEPTION_DESK_FAB_ARCHIVE_ARIA_LABEL,
  RECEPTION_DESK_FAB_BOOKING_INBOX_ARIA_LABEL,
  RECEPTION_DESK_FAB_CLUSTER_POSITION_CLASS,
  RECEPTION_DESK_FAB_DIAL_TRIGGER_ARIA_LABEL,
} from './receptionIssueAccessCta';

interface ReceptionDeskFabClusterProps {
  visible: boolean;
  openBookingInboxCount: number;
  onNewBooking: () => void;
  onOpenBookingInbox: () => void;
  onOpenArchive: () => void;
  disabled?: boolean;
}

/**
 * Mobile-only desk actions: primary New booking (1 tap) + speed-dial for
 * Booking.com inbox / Archive. Hidden from `lg` up (desktop uses header + Plan shortcuts).
 */
export function ReceptionDeskFabCluster({
  visible,
  openBookingInboxCount,
  onNewBooking,
  onOpenBookingInbox,
  onOpenArchive,
  disabled = false,
}: ReceptionDeskFabClusterProps) {
  const [dialOpen, setDialOpen] = useState(false);
  const clusterRef = useRef<HTMLDivElement>(null);
  const dialListId = useId();

  useEffect(() => {
    if (!visible) setDialOpen(false);
  }, [visible]);

  useEffect(() => {
    if (!dialOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const root = clusterRef.current;
      if (!root) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      setDialOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [dialOpen]);

  if (!visible) {
    return null;
  }

  const openInbox = () => {
    setDialOpen(false);
    onOpenBookingInbox();
  };

  const openArchive = () => {
    setDialOpen(false);
    onOpenArchive();
  };

  return (
    <div
      ref={clusterRef}
      className={cn(
        RECEPTION_DESK_FAB_CLUSTER_POSITION_CLASS,
        'flex flex-col-reverse items-end gap-2'
      )}
    >
      <ReceptionIssueAccessFab
        visible
        disabled={disabled}
        onPress={() => {
          setDialOpen(false);
          onNewBooking();
        }}
      />

      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={disabled}
        className="relative rounded-full bg-background shadow-lg"
        aria-label={RECEPTION_DESK_FAB_DIAL_TRIGGER_ARIA_LABEL}
        aria-expanded={dialOpen}
        aria-controls={dialListId}
        onClick={() => setDialOpen((open) => !open)}
      >
        <MoreHorizontal aria-hidden />
        {!dialOpen && openBookingInboxCount > 0 ? (
          <span
            aria-label={`${openBookingInboxCount} open in Booking.com inbox`}
            className={cn(
              'absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full',
              'bg-destructive px-1 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground'
            )}
          >
            {openBookingInboxCount > 99 ? '99+' : openBookingInboxCount}
          </span>
        ) : null}
      </Button>

      {dialOpen ? (
        <div id={dialListId} className="flex flex-col-reverse items-end gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="relative rounded-full bg-background shadow-lg"
            aria-label={RECEPTION_DESK_FAB_BOOKING_INBOX_ARIA_LABEL}
            onClick={openInbox}
          >
            <Inbox aria-hidden />
            {openBookingInboxCount > 0 ? (
              <span
                aria-label={`${openBookingInboxCount} open`}
                className={cn(
                  'absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full',
                  'bg-destructive px-1 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground'
                )}
              >
                {openBookingInboxCount > 99 ? '99+' : openBookingInboxCount}
              </span>
            ) : null}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="rounded-full bg-background shadow-lg"
            aria-label={RECEPTION_DESK_FAB_ARCHIVE_ARIA_LABEL}
            onClick={openArchive}
          >
            <Archive aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
