'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

export type ConfirmDialogActionVariant = 'default' | 'destructive' | 'outline';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: ConfirmDialogActionVariant;
  onCancel: () => void;
  onConfirm: () => void;
  /** Overlay + dialog stacking. Default above stay sheets (`z-50`). */
  className?: string;
}

/**
 * In-app confirm above nested modals/sheets (`z-[60]` + body portal).
 * Prefer over `window.confirm` when a sheet/dialog already owns the viewport.
 *
 * `pointer-events-auto` is required: Radix/Vaul modal sets `body { pointer-events: none }`
 * and only re-enables the sheet content layer — portal siblings stay inert without it.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel = 'Cancel',
  confirmLabel = 'Continue',
  confirmVariant = 'destructive',
  onCancel,
  onConfirm,
  className,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        'pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4',
        className
      )}
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-xl border bg-background p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-sm font-semibold">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
