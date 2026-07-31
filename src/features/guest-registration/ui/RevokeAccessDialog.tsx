'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/shared/ui';

interface CancelBookingDialogProps {
  open: boolean;
  intent: 'cancel' | 'checkout';
  onKeep: () => void;
  onConfirm: () => void;
  isPending?: boolean;
  /** Party checkout: plural copy when > 1. */
  guestCount?: number;
}

/** Confirm cancel (pre-admit) or check out (post-admit) → Archive. */
export function CancelBookingDialog({
  open,
  intent,
  onKeep,
  onConfirm,
  isPending = false,
  guestCount = 1,
}: CancelBookingDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onKeep();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onKeep]);

  if (!open || !mounted) {
    return null;
  }

  const isCheckout = intent === 'checkout';
  const isPartyCheckout = isCheckout && guestCount > 1;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onKeep}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        className="w-full max-w-sm space-y-4 rounded-xl border bg-background p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-2">
          <h2 id="cancel-booking-title" className="text-sm font-semibold">
            {isPartyCheckout
              ? `Check out ${guestCount} guests?`
              : isCheckout
                ? 'Check out this guest?'
                : 'Cancel this booking?'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isPartyCheckout
              ? 'Guest app access will be revoked for each checked-in guest. Today\'s night and any remaining nights leave inventory and go to Archive. Lived nights stay on the original bookings. Guests not yet checked in are left unchanged.'
              : isCheckout
                ? 'Guest app access will be revoked. Today\'s night and any remaining nights leave inventory and go to Archive. Lived nights stay on the original booking.'
                : 'Guest app access will be revoked. The booking moves to Archive and the bed is freed for all nights.'}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onKeep} disabled={isPending}>
            {isPartyCheckout ? 'Keep bookings' : 'Keep booking'}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending
              ? isCheckout
                ? 'Checking out…'
                : 'Cancelling…'
              : isPartyCheckout
                ? 'Check out all'
                : isCheckout
                  ? 'Check out'
                  : 'Cancel booking'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** @deprecated Prefer CancelBookingDialog */
export function ArchiveStayDialog(props: Omit<CancelBookingDialogProps, 'intent'>) {
  return <CancelBookingDialog {...props} intent="cancel" />;
}

/** @deprecated Prefer CancelBookingDialog */
export { ArchiveStayDialog as RevokeAccessDialog };
