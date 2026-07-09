'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  Button,
} from '@/shared/ui';

export const RECEPTION_STAY_DETAIL_TITLE_ID = 'reception-stay-detail-title';

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

export interface ReceptionStayDetailShellProps {
  open: boolean;
  onClose: () => void;
  header: ReactNode;
  body: ReactNode;
  footer: ReactNode;
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
  header,
  body,
  footer,
}: ReceptionStayDetailShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const labelledBy = RECEPTION_STAY_DETAIL_TITLE_ID;

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
        className="flex max-h-[min(90vh,800px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-background shadow-lg outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-border/60 px-6 py-4 pr-14">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3"
            onClick={onClose}
          >
            <X />
            <span className="sr-only">Close</span>
          </Button>
          {header}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">{body}</div>

        <div className="shrink-0 border-t border-border/60 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

function MobileStayDetailSheet({
  open,
  onClose,
  header,
  body,
  footer,
}: ReceptionStayDetailShellProps) {
  const labelledBy = RECEPTION_STAY_DETAIL_TITLE_ID;

  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <BottomSheetContent
        size={BOTTOM_SHEET_SIZES.large}
        className="flex flex-col px-0 pb-0"
        aria-labelledby={labelledBy}
      >
        <BottomSheetHeader className="px-6 pb-3">{header}</BottomSheetHeader>
        <BottomSheetBody className="space-y-4 pb-4">{body}</BottomSheetBody>
        <BottomSheetFooter className="border-t border-border/60 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {footer}
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}

export function ReceptionStayDetailShell({
  open,
  onClose,
  header,
  body,
  footer,
}: ReceptionStayDetailShellProps) {
  const isBelowLg = useIsBelowLg();

  if (!open) {
    return null;
  }

  if (isBelowLg) {
    return (
      <MobileStayDetailSheet
        open
        onClose={onClose}
        header={header}
        body={body}
        footer={footer}
      />
    );
  }

  return (
    <DesktopStayDetailDialog
      open
      onClose={onClose}
      header={header}
      body={body}
      footer={footer}
    />
  );
}
