'use client';

import { cn } from '@/shared/lib/utils';
import { isValidTimeValue } from '@/shared/lib/time';
import { adminFieldWidthClass, type AdminFieldWidth } from './AdminField';

interface AdminTimeFieldProps {
  label: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  hint?: string;
  missing?: boolean;
  width?: AdminFieldWidth;
}

export function AdminTimeField({
  label,
  name,
  defaultValue,
  value,
  onChange,
  hint,
  missing = false,
  width = 'xs',
}: AdminTimeFieldProps) {
  const isControlled = value !== undefined;
  const displayValue = isControlled ? value : defaultValue;
  const invalid = Boolean(displayValue?.trim()) && !isValidTimeValue(displayValue);

  return (
    <label className="block space-y-1.5">
      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {label}
        {missing ? (
          <span className="text-xs font-normal text-amber-700">Required for guests</span>
        ) : null}
      </span>
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      <input
        {...(name ? { name } : {})}
        type="time"
        value={isControlled ? value : undefined}
        defaultValue={isControlled ? undefined : defaultValue}
        onChange={isControlled ? (event) => onChange?.(event.target.value) : undefined}
        className={cn(
          'rounded-md border bg-background px-3 py-2 text-sm',
          adminFieldWidthClass(width),
          (missing || invalid) && 'border-amber-400 ring-1 ring-amber-200'
        )}
      />
      {invalid ? (
        <span className="text-xs text-amber-700">Use 24-hour format (e.g. 14:00).</span>
      ) : null}
    </label>
  );
}
