'use client';

import { Button } from '@/shared/ui';

export interface TenantUnsavedSectionDialogLabels {
  title: string;
  description: string;
  stay: string;
  keepEditingElsewhere: string;
  discardChanges: string;
}

const DEFAULT_LABELS: TenantUnsavedSectionDialogLabels = {
  title: 'Unsaved changes',
  description:
    'Your edits are kept in this form until you save. You can switch sections and keep editing, or discard everything and revert to the last saved version.',
  stay: 'Stay',
  keepEditingElsewhere: 'Keep editing elsewhere',
  discardChanges: 'Discard changes',
};

export interface TenantUnsavedSectionDialogProps {
  open: boolean;
  labels?: TenantUnsavedSectionDialogLabels;
  onStay: () => void;
  onKeepEditingElsewhere: () => void;
  onDiscardChanges: () => void;
}

export function TenantUnsavedSectionDialog({
  open,
  labels = DEFAULT_LABELS,
  onStay,
  onKeepEditingElsewhere,
  onDiscardChanges,
}: TenantUnsavedSectionDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onStay}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tenant-unsaved-nav-title"
        aria-describedby="tenant-unsaved-nav-desc"
        className="w-full max-w-md rounded-xl border bg-background p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="tenant-unsaved-nav-title" className="text-sm font-semibold">
          {labels.title}
        </h2>
        <p id="tenant-unsaved-nav-desc" className="mt-2 text-sm text-muted-foreground">
          {labels.description}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="button" variant="outline" onClick={onStay}>
            {labels.stay}
          </Button>
          <Button type="button" variant="secondary" onClick={onKeepEditingElsewhere}>
            {labels.keepEditingElsewhere}
          </Button>
          <Button type="button" variant="destructive" onClick={onDiscardChanges}>
            {labels.discardChanges}
          </Button>
        </div>
      </div>
    </div>
  );
}
