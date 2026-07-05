import { cn } from '@/shared/lib/utils';

export function doorAccessSlideEnterClass(
  direction: 1 | -1,
  prefersReducedMotion: boolean
): string {
  if (prefersReducedMotion) {
    return 'animate-in fade-in duration-200 fill-mode-both';
  }

  return cn(
    'animate-in fade-in duration-200 fill-mode-both',
    direction > 0 ? 'slide-in-from-right-3' : 'slide-in-from-left-3'
  );
}
