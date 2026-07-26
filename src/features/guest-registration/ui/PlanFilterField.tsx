import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export interface PlanFilterFieldProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/** Label stacked above filter control — keeps Plan filter rows consistent. */
export function PlanFilterField({ label, htmlFor, children, className }: PlanFilterFieldProps) {
  const labelClassName = 'text-[11px] text-muted-foreground';

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClassName}>
          {label}
        </label>
      ) : (
        <span className={labelClassName}>{label}</span>
      )}
      <div className="min-w-0 w-full">{children}</div>
    </div>
  );
}
