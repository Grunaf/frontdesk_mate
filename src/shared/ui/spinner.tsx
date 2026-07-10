import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui/icon';

const spinnerSizeClass = {
  sm: 'size-3.5',
  default: 'size-4',
  lg: 'size-5',
} as const;

export type SpinnerSize = keyof typeof spinnerSizeClass;

export function Spinner({
  className,
  size = 'default',
}: {
  className?: string;
  size?: SpinnerSize;
}) {
  return (
    <Icon
      icon={Loader2}
      className={cn(spinnerSizeClass[size], 'animate-spin', className)}
      aria-hidden
    />
  );
}
