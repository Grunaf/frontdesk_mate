'use client';

import { Button } from '@/shared/ui';

interface RevokeAccessDialogProps {
  open: boolean;
  onKeep: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function RevokeAccessDialog({
  open,
  onKeep,
  onConfirm,
  isPending = false,
}: RevokeAccessDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="revoke-access-title"
        className="w-full max-w-sm space-y-4 rounded-xl border bg-background p-5 shadow-lg"
      >
        <div className="space-y-2">
          <h2 id="revoke-access-title" className="text-sm font-semibold">
            Revoke guest access?
          </h2>
          <p className="text-sm text-muted-foreground">
            The guest will lose app access and their PIN and link will stop working. This does not
            affect their booking elsewhere.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onKeep} disabled={isPending}>
            Keep access
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Revoking…' : 'Revoke access'}
          </Button>
        </div>
      </div>
    </div>
  );
}
