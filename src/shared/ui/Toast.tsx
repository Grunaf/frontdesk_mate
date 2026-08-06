'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui/icon';

export type ToastVariant = 'info' | 'success' | 'warning';
export type ToastPlacement = 'top' | 'bottom';

export interface ToastProps {
  variant: ToastVariant;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  /** Defaults to 5000. Pass `null` to keep toast until dismiss. */
  autoDismissMs?: number | null;
  placement?: ToastPlacement;
  dismissAriaLabel?: string;
  className?: string;
}

const variantClassName: Record<ToastVariant, string> = {
  info: 'border-border bg-background text-foreground',
  success: 'border-green-200 bg-green-50 text-green-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
};

const placementClassName: Record<ToastPlacement, string> = {
  top: 'top-4',
  bottom: 'bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] lg:bottom-8',
};

/**
 * Ephemeral fixed toast. Parent owns visibility state (one toast at a time).
 * Body portal + z-[60] so toast stays above sheets (same stack as ConfirmDialog).
 * `pointer-events-auto`: Vaul/Radix modal sets `body { pointer-events: none }`.
 */
export function Toast({
  variant,
  message,
  actionLabel,
  onAction,
  onDismiss,
  autoDismissMs = 5000,
  placement = 'top',
  dismissAriaLabel = 'Dismiss',
  className,
}: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (autoDismissMs == null) return;
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto fixed left-1/2 z-[60] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg',
        placementClassName[placement],
        variantClassName[variant],
        className
      )}
    >
      <p className="min-w-0 flex-1 truncate whitespace-nowrap font-medium">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 text-xs font-semibold underline underline-offset-2"
        >
          {actionLabel}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissAriaLabel}
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
      >
        <Icon icon={X} className="size-4" />
      </button>
    </div>,
    document.body
  );
}
