'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';
import { pressablePendingClass, pressableTileActiveClass } from './pressableVariants';

type PressableTileButtonProps = ComponentProps<'button'> & {
  pending?: boolean;
};

/** Square tile control (stay essentials carousel) with shared press + pending feedback. */
export function PressableTileButton({
  pending = false,
  className,
  disabled,
  ...props
}: PressableTileButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(pressableTileActiveClass, pending && pressablePendingClass, className)}
      {...props}
    />
  );
}
