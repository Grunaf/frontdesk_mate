'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

export type AdminToastVariant = 'success' | 'warning';

export interface AdminToastProps {
  variant: AdminToastVariant;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function AdminToast({
  variant,
  message,
  actionLabel,
  onAction,
  onDismiss,
  autoDismissMs = 5000,
}: AdminToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed left-1/2 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg',
        variant === 'success'
          ? 'border-green-200 bg-green-50 text-green-950'
          : 'border-amber-200 bg-amber-50 text-amber-950'
      )}
    >
      <p className="min-w-0 flex-1 font-medium">{message}</p>
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
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
      >
        <Icon icon={X} className="size-4" />
      </button>
    </div>
  );
}
