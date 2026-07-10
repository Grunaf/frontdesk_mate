import { cn } from '@/shared/lib/utils';

export const pressablePendingClass = 'pointer-events-none opacity-80 aria-busy:opacity-80';

export const pressableTileActiveClass =
  'transition-[colors,transform,opacity] active:scale-[0.98] motion-reduce:active:scale-100';

export function pressableTileClassName(pending?: boolean) {
  return cn(pressableTileActiveClass, pending && pressablePendingClass);
}
