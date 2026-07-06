'use client';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { X } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button } from './button';
import { useRegisterBottomSheetOpen } from './bottom-sheet-open-context';
import { useBottomSheetScrollFade } from './useBottomSheetScrollFade';

export const BOTTOM_SHEET_SIZES = {
  small: 'small',
  medium: 'compact',
  large: 'large',
} as const;

export type BottomSheetSize = (typeof BOTTOM_SHEET_SIZES)[keyof typeof BOTTOM_SHEET_SIZES];

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

const BottomSheetSizeContext = React.createContext<BottomSheetSize>(BOTTOM_SHEET_SIZES.medium);

const BottomSheetChromeContext = React.createContext(false);

type BottomSheetProps = React.ComponentProps<typeof DrawerPrimitive.Root> & {
  /** When true, dim overlay starts below `--app-header-height` so the app header stays visible and clickable. */
  preserveAppHeaderAccess?: boolean;
};

function BottomSheet({
  shouldScaleBackground = false,
  noBodyStyles = true,
  open,
  onOpenChange,
  dismissible,
  modal: modalProp,
  preserveAppHeaderAccess: preserveAppHeaderAccessProp,
  ...props
}: BottomSheetProps) {
  useRegisterBottomSheetOpen(open);

  const preserveAppHeaderAccess = preserveAppHeaderAccessProp ?? dismissible === false;
  const modal = preserveAppHeaderAccess ? false : modalProp;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  return (
    <BottomSheetChromeContext.Provider value={preserveAppHeaderAccess}>
      <DrawerPrimitive.Root
        data-slot="bottom-sheet"
        shouldScaleBackground={shouldScaleBackground}
        noBodyStyles={noBodyStyles}
        open={open}
        onOpenChange={handleOpenChange}
        dismissible={dismissible}
        {...props}
        modal={modal}
      />
    </BottomSheetChromeContext.Provider>
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

function bottomSheetOverlayClassName(preserveAppHeaderAccess: boolean, className?: string) {
  return cn(
    'fixed inset-x-0 bottom-0 z-50 bg-black/80 supports-backdrop-filter:backdrop-blur-xs',
    preserveAppHeaderAccess ? 'top-[var(--app-header-height,0px)]' : 'top-0',
    className
  );
}

function BottomSheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  const preserveAppHeaderAccess = React.useContext(BottomSheetChromeContext);

  if (preserveAppHeaderAccess) {
    return (
      <div
        data-slot="bottom-sheet-overlay"
        aria-hidden
        className={cn(bottomSheetOverlayClassName(true, className), 'animate-in fade-in-0')}
      />
    );
  }

  return (
    <DrawerPrimitive.Overlay
      data-slot="bottom-sheet-overlay"
      className={cn(
        bottomSheetOverlayClassName(false, className),
        'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'
      )}
      {...props}
    />
  );
}

function BottomSheetContent({
  className,
  children,
  showCloseButton = true,
  showDragHandle = true,
  size = BOTTOM_SHEET_SIZES.medium,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  showCloseButton?: boolean;
  showDragHandle?: boolean;
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
            !showDragHandle && 'pt-5',
            className
          )}
          {...props}
        >
          {showDragHandle ? (
            <DrawerPrimitive.Handle className="mx-auto mt-3 flex w-full shrink-0 cursor-grab justify-center py-1 active:cursor-grabbing">
              <span className="h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden="true" />
            </DrawerPrimitive.Handle>
          ) : null}
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

function BottomSheetScrollFade({
  position,
}: {
  position: 'top' | 'bottom';
}) {
  return (
    <div
      aria-hidden="true"
      data-slot={`bottom-sheet-scroll-fade-${position}`}
      className={cn(
        'pointer-events-none absolute inset-x-0 z-10 h-8 motion-reduce:transition-none',
        position === 'top'
          ? 'top-0 bg-gradient-to-b from-popover via-popover/80 to-transparent'
          : 'bottom-0 bg-gradient-to-t from-popover via-popover/80 to-transparent'
      )}
    />
  );
}

function BottomSheetBody({
  className,
  showScrollFade = true,
  showTopScrollFade = true,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showScrollFade?: boolean;
  showTopScrollFade?: boolean;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { canScrollUp, canScrollDown } = useBottomSheetScrollFade(scrollRef, showScrollFade, children);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        data-slot="bottom-sheet-body"
        className={cn(
          'h-full overflow-y-auto overscroll-contain px-6 pt-4',
          canScrollDown && 'pb-2',
          className
        )}
        {...props}
      >
        {children}
      </div>
      {showScrollFade && showTopScrollFade && canScrollUp ? (
        <BottomSheetScrollFade position="top" />
      ) : null}
      {showScrollFade && canScrollDown ? <BottomSheetScrollFade position="bottom" /> : null}
    </div>
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
