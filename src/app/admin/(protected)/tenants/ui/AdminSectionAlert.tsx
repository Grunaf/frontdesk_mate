import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface AdminSectionAlertProps {
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function AdminSectionAlert({
  children,
  actionLabel,
  onAction,
  className,
}: AdminSectionAlertProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900',
        className
      )}
    >
      <p>{children}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 text-xs font-semibold text-amber-950 underline-offset-2 hover:underline"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
