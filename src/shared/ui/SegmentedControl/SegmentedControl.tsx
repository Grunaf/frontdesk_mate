'use client';

import { cn } from '@/shared/lib/utils';

export type SegmentedControlItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

export type SegmentedControlProps = {
  items: SegmentedControlItem[];
  value: string;
  onValueChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
};

/**
 * Compact mutually-exclusive segmented control (not chip cloud).
 * Visual track ~32px; vertical padding expands the tap target without growing chrome.
 */
export function SegmentedControl({
  items,
  value,
  onValueChange,
  ariaLabel,
  className,
}: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex max-w-full items-center py-1.5', className)}
    >
      <div className="inline-flex h-8 min-w-0 items-stretch rounded-md border border-border bg-muted/40 p-0.5">
        {items.map((item) => {
          const isActive = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={item.disabled}
              onClick={() => onValueChange(item.id)}
              className={cn(
                'min-w-0 shrink-0 rounded-sm px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                item.disabled && 'pointer-events-none opacity-40'
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
