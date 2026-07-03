import { ReactNode, forwardRef, ComponentPropsWithoutRef } from 'react';

import { Label } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

interface BookingFieldProps extends ComponentPropsWithoutRef<'div'> {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
}

export const BookingField = forwardRef<HTMLDivElement, BookingFieldProps>(
  ({ icon, label, value, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        className={cn(
          'relative flex w-full cursor-pointer touch-manipulation items-center gap-4 rounded-xl px-4 py-3.5 transition-colors select-none hover:bg-muted/80',
          className
        )}
        {...props}
      >
        <div className="pointer-events-none z-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="pointer-events-none z-0 flex w-full min-w-0 flex-col items-start justify-center text-left">
          <Label className="text-xs font-bold tracking-wider uppercase">{label}</Label>
          <div className="relative mt-1.5 flex w-full items-center">{value}</div>
        </div>
        {children}
      </div>
    );
  }
);

BookingField.displayName = 'BookingField';
