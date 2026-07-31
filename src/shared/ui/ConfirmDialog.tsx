'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

export type ConfirmDialogActionVariant = 'default' | 'destructive' | 'outline';

export interface ConfirmDialogProps {
  open: boolean;
  /** Optional; omitted for compact description-only confirms. */
  title?: string;
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
  const hasTitle = Boolean(title?.trim());

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
        aria-labelledby={hasTitle ? titleId : descriptionId}
        aria-describedby={descriptionId}
        className="w-full max-w-sm rounded-lg border bg-background px-4 py-3 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        {hasTitle ? (
          <h2 id={titleId} className="text-sm font-semibold">
            {title}
          </h2>
        ) : null}
        <p
          id={descriptionId}
          className={cn('text-sm text-muted-foreground', hasTitle && 'mt-1.5')}
        >
          {description}
        </p>
        <div className="mt-3 flex flex-row justify-end gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={
              confirmVariant === 'destructive'
                ? 'text-destructive hover:text-destructive'
                : undefined
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
