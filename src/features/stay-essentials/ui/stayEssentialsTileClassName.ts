import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib/utils';

export const stayEssentialsTileSizeClass =
  'aspect-square w-[30vw] max-w-[100px] shrink-0 snap-start';

export function stayEssentialsTileClassName({
  isRead = true,
  accentColor,
}: {
  isRead?: boolean;
  accentColor?: string;
} = {}): { className: string; style?: CSSProperties } {
  return {
    className: cn(
      stayEssentialsTileSizeClass,
      'relative overflow-hidden rounded-xl p-2.5 text-left',
      'transition-colors',
      accentColor ? 'hover:brightness-[0.97] active:brightness-95' : 'hover:bg-muted/40 active:bg-muted/60',
      !accentColor && 'bg-card',
      isRead ? 'border border-border/70' : 'border border-primary/45'
    ),
    style: accentColor ? { backgroundColor: accentColor } : undefined,
  };
}
