'use client';

import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { cn } from '@/shared/lib/utils';

export type NumberStepperProps = {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max: number;
  ariaLabel: string;
  id?: string;
  className?: string;
  disabled?: boolean;
};

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compact − / input / + control for bounded integer quantities (e.g. guest count).
 */
export function NumberStepper({
  value,
  onValueChange,
  min = 1,
  max,
  ariaLabel,
  id,
  className,
  disabled = false,
}: NumberStepperProps) {
  const inputId = useId();
  const clampedMax = Math.max(min, max);
  const current = clampInt(value, min, clampedMax);
  const [draft, setDraft] = useState(String(current));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(current));
    }
  }, [current, focused]);

  const canDecrease = !disabled && current > min;
  const canIncrease = !disabled && current < clampedMax;

  const commitDraft = () => {
    const parsed = Number.parseInt(draft.trim(), 10);
    if (!Number.isFinite(parsed)) {
      setDraft(String(current));
      return;
    }
    const next = clampInt(parsed, min, clampedMax);
    setDraft(String(next));
    if (next !== current) {
      onValueChange(next);
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDraft();
      event.currentTarget.blur();
    }
  };

  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={!canDecrease}
        aria-label={`Decrease ${ariaLabel}`}
        onClick={() => onValueChange(current - 1)}
      >
        <Minus />
      </Button>
      <Input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={draft}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={clampedMax}
        aria-valuenow={current}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commitDraft();
        }}
        onKeyDown={onInputKeyDown}
        onChange={(event) => {
          const next = event.target.value;
          if (next === '' || /^\d+$/.test(next)) {
            setDraft(next);
          }
        }}
        className="h-9 w-12 px-1 text-center text-sm font-medium tabular-nums lg:h-7"
      />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={!canIncrease}
        aria-label={`Increase ${ariaLabel}`}
        onClick={() => onValueChange(current + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}
