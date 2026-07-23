'use client';

import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Icon } from '../icon';

export interface SegmentedChipItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  locked?: boolean;
}

export interface SegmentedChipBarProps {
  items: SegmentedChipItem[];
  value: string;
  onValueChange: (id: string) => void;
  onLockedClick?: (id: string) => void;
  ariaLabel: string;
  /** Bleed into horizontal padding of a px-4 parent (default). Use false at page edge. */
  bleed?: boolean;
  /** Wrap chips onto next lines instead of horizontal scroll. */
  wrap?: boolean;
  className?: string;
}

export function SegmentedChipBar({
  items,
  value,
  onValueChange,
  onLockedClick,
  ariaLabel,
  bleed = true,
  wrap = false,
  className,
}: SegmentedChipBarProps) {
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (wrap) {
      return;
    }

    const activeTab = tabRefs.current.get(value);
    if (!activeTab) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      activeTab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [value, items, wrap]);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center justify-start gap-2 py-1.5',
        wrap ? 'flex-wrap' : 'no-scrollbar overflow-x-auto',
        bleed ? '-mx-4 px-4 sm:mx-0 sm:px-0' : 'px-4',
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.id === value;
        const isLocked = Boolean(item.locked);

        return (
          <button
            key={item.id}
            ref={(element) => {
              if (element) {
                tabRefs.current.set(item.id, element);
              } else {
                tabRefs.current.delete(item.id);
              }
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={item.disabled}
            onClick={() => {
              if (isLocked) {
                onLockedClick?.(item.id);
                return;
              }
              onValueChange(item.id);
            }}
            className={cn(
              'h-auto min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground',
              isLocked && 'opacity-70',
              item.disabled && 'pointer-events-none opacity-40'
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {item.icon ? <Icon icon={item.icon} className="h-3.5 w-3.5 shrink-0" /> : null}
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
