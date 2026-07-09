'use client';

import { Button } from '@/shared/ui';

export type ReissueAccessDialogIntent = 'reissueAccess';

interface ReissueAccessDialogProps {
  open: boolean;
  guestLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function ReissueAccessDialog({
  open,
  guestLabel,
  onCancel,
  onConfirm,
  isPending = false,
}: ReissueAccessDialogProps) {
  if (!open) {
    return null;
  }

  const body = guestLabel
    ? `Issues a new PIN and link for ${guestLabel}. The reservation (bed and dates) stays the same.`
    : 'Issues a new PIN and link. The reservation (bed and dates) stays the same.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reissue-access-title"
        className="w-full max-w-sm space-y-4 rounded-xl border bg-background p-5 shadow-lg"
      >
        <div className="space-y-2">
          <h2 id="reissue-access-title" className="text-sm font-semibold">
            Reissue guest access?
          </h2>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Re-issuing…' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
