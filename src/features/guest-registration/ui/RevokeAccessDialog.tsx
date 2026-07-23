'use client';

import { Button } from '@/shared/ui';

interface CancelBookingDialogProps {
  open: boolean;
  intent: 'cancel' | 'checkout';
  onKeep: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}

/** Confirm cancel (pre-admit) or check out (post-admit) → Archive. */
export function CancelBookingDialog({
  open,
  intent,
  onKeep,
  onConfirm,
  isPending = false,
}: CancelBookingDialogProps) {
  if (!open) {
    return null;
  }

  const isCheckout = intent === 'checkout';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        className="w-full max-w-sm space-y-4 rounded-xl border bg-background p-5 shadow-lg"
      >
        <div className="space-y-2">
          <h2 id="cancel-booking-title" className="text-sm font-semibold">
            {isCheckout ? 'Check out this guest?' : 'Cancel this booking?'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isCheckout
              ? 'Guest app access will be revoked. Today\'s night and any remaining nights leave inventory and go to Archive. Lived nights stay on the original booking.'
              : 'Guest app access will be revoked. The booking moves to Archive and the bed is freed for all nights.'}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onKeep} disabled={isPending}>
            Keep booking
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending
              ? isCheckout
                ? 'Checking out…'
                : 'Cancelling…'
              : isCheckout
                ? 'Check out'
                : 'Cancel booking'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Prefer CancelBookingDialog */
export function ArchiveStayDialog(props: Omit<CancelBookingDialogProps, 'intent'>) {
  return <CancelBookingDialog {...props} intent="cancel" />;
}

/** @deprecated Prefer CancelBookingDialog */
export { ArchiveStayDialog as RevokeAccessDialog };
