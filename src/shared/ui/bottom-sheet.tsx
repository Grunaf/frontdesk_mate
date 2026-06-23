'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { X } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button } from './button';
import { useBottomSheetOpenNotifier } from './bottom-sheet-open-context';

type BottomSheetSize = 'small' | 'compact' | 'large';

function bottomSheetSizeClassName(size: BottomSheetSize): string {
  switch (size) {
    case 'large':
      return 'h-[min(94dvh,94vh)] max-h-[min(94dvh,94vh)]';
    case 'small':
      return 'h-[min(38dvh,280px)] max-h-[min(38dvh,280px)]';
    case 'compact':
    default:
      return 'h-[min(56dvh,480px)] max-h-[min(56dvh,480px)]';
  }
}

const BottomSheetSizeContext = React.createContext<BottomSheetSize>('compact');

type BottomSheetProps = React.ComponentProps<typeof DrawerPrimitive.Root>;

function BottomSheet({
  shouldScaleBackground = false,
  noBodyStyles = true,
  open,
  onOpenChange,
  ...props
}: BottomSheetProps) {
  const notifyOpenChange = useBottomSheetOpenNotifier();

  React.useEffect(() => {
    if (open === undefined) {
      return;
    }

    if (!open) {
      return;
    }

    notifyOpenChange(true);
    return () => notifyOpenChange(false);
  }, [notifyOpenChange, open]);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (open === undefined) {
        notifyOpenChange(next);
      }

      onOpenChange?.(next);
    },
    [notifyOpenChange, onOpenChange, open]
  );

  return (
    <DrawerPrimitive.Root
      data-slot="bottom-sheet"
      shouldScaleBackground={shouldScaleBackground}
      noBodyStyles={noBodyStyles}
      open={open}
      onOpenChange={handleOpenChange}
      {...props}
    />
  );
}

function BottomSheetTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="bottom-sheet-trigger" {...props} />;
}

function BottomSheetPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="bottom-sheet-portal" {...props} />;
}

function BottomSheetClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="bottom-sheet-close" {...props} />;
}

function BottomSheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="bottom-sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/80 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className
      )}
      {...props}
    />
  );
}

function BottomSheetContent({
  className,
  children,
  showCloseButton = true,
  size = 'compact',
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  showCloseButton?: boolean;
  size?: BottomSheetSize;
}) {
  return (
    <BottomSheetSizeContext.Provider value={size}>
      <BottomSheetPortal>
        <BottomSheetOverlay />
        <DrawerPrimitive.Content
          data-slot="bottom-sheet-content"
          data-size={size}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border bg-popover text-popover-foreground shadow-lg outline-none',
            bottomSheetSizeClassName(size),
            className
          )}
          {...props}
        >
          <DrawerPrimitive.Handle className="mx-auto mt-3 flex w-full shrink-0 cursor-grab justify-center py-1 active:cursor-grabbing">
            <span className="h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden="true" />
          </DrawerPrimitive.Handle>
          {children}
          {showCloseButton ? (
            <BottomSheetClose asChild>
              <Button variant="ghost" className="absolute top-3 right-3" size="icon-sm">
                <X />
                <span className="sr-only">Close</span>
              </Button>
            </BottomSheetClose>
          ) : null}
        </DrawerPrimitive.Content>
      </BottomSheetPortal>
    </BottomSheetSizeContext.Provider>
  );
}

function BottomSheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="bottom-sheet-header"
      className={cn('flex shrink-0 flex-col gap-1.5 px-6 pt-2', className)}
      {...props}
    />
  );
}

function BottomSheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="bottom-sheet-body"
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain px-6',
        className
      )}
      {...props}
    />
  );
}

function BottomSheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="bottom-sheet-footer"
      className={cn('mt-0 flex shrink-0 flex-col gap-2 px-6 pb-6 pt-4', className)}
      {...props}
    />
  );
}

function BottomSheetTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="bottom-sheet-title"
      className={cn('text-base font-semibold text-foreground', className)}
      {...props}
    />
  );
}

function BottomSheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="bottom-sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  BottomSheet,
  BottomSheetPortal,
  BottomSheetOverlay,
  BottomSheetTrigger,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetBody,
  BottomSheetFooter,
  BottomSheetTitle,
  BottomSheetDescription,
};
