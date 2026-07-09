'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RECEPTION_STAY_DETAIL_TITLE_ID } from './ReceptionGuestStayDetail';
import { Button, Sheet, SheetContent } from '@/shared/ui';

function useIsBelowLg(): boolean {
  const [isBelowLg, setIsBelowLg] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsBelowLg(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isBelowLg;
}

interface ReceptionStayDetailShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

function useCloseOnEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);
}

function DesktopStayDetailDialog({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useCloseOnEscape(open, onClose);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-5 shadow-lg outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0"
            onClick={onClose}
          >
            Close
          </Button>
          {children}
        </div>
      </div>
    </div>
  );
}

function MobileStayDetailSheet({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy: string;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
        aria-labelledby={labelledBy}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

export function ReceptionStayDetailShell({ open, onClose, children }: ReceptionStayDetailShellProps) {
  const isBelowLg = useIsBelowLg();
  const labelledBy = RECEPTION_STAY_DETAIL_TITLE_ID;

  if (!open) {
    return null;
  }

  if (isBelowLg) {
    return (
      <MobileStayDetailSheet open onClose={onClose} labelledBy={labelledBy}>
        {children}
      </MobileStayDetailSheet>
    );
  }

  return (
    <DesktopStayDetailDialog open onClose={onClose} labelledBy={labelledBy}>
      {children}
    </DesktopStayDetailDialog>
  );
}
