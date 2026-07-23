'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pencil, X } from 'lucide-react';
import {
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
} from '@/shared/ui';

export const RECEPTION_STAY_DETAIL_TITLE_ID = 'reception-stay-detail-title';
export const RECEPTION_ISSUE_ACCESS_TITLE_ID = 'reception-issue-access-title';

const RECEPTION_SHELL_TITLE_CLASS = 'text-base font-semibold leading-tight';

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
  /** Primary dialog/sheet title (Radix `DialogTitle` on mobile). */
  accessibleTitle: string;
  /** Optional native `title` tooltip on the primary heading. */
  accessibleTitleTooltip?: string;
  header: ReactNode;
  body: ReactNode;
  footer: ReactNode;
  /** Defaults to {@link RECEPTION_STAY_DETAIL_TITLE_ID}. */
  titleId?: string;
  /**
   * When set, stay-detail chrome shows Edit (pencil).
   * Mobile: close on the left, pencil on the right.
   * Desktop: pencil left of close (close stays top-right).
   */
  onEdit?: () => void;
  editDisabled?: boolean;
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
  accessibleTitle,
  accessibleTitleTooltip,
  header,
  body,
  footer,
  titleId = RECEPTION_STAY_DETAIL_TITLE_ID,
  onEdit,
  editDisabled = false,
}: ReceptionStayDetailShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const labelledBy = titleId;
  const hasEdit = Boolean(onEdit);

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
        <div
          className={`relative shrink-0 border-b border-border/60 px-6 py-4 ${hasEdit ? 'pr-24' : 'pr-14'}`}
        >
          <div className="absolute top-3 right-3 flex items-center gap-1">
            {onEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={editDisabled}
                onClick={onEdit}
              >
                <Pencil />
                <span className="sr-only">Edit</span>
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="icon" onClick={onClose}>
              <X />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <div className="space-y-1">
            <h2
              id={labelledBy}
              className={RECEPTION_SHELL_TITLE_CLASS}
              title={accessibleTitleTooltip}
            >
              {accessibleTitle}
            </h2>
            {header}
          </div>
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
  accessibleTitle,
  accessibleTitleTooltip,
  header,
  body,
  footer,
  titleId = RECEPTION_STAY_DETAIL_TITLE_ID,
  onEdit,
  editDisabled = false,
}: ReceptionStayDetailShellProps) {
  const labelledBy = titleId;
  const hasEditChrome = Boolean(onEdit);

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
        aria-describedby={undefined}
        showCloseButton={!hasEditChrome}
      >
        {hasEditChrome ? (
          <>
            <BottomSheetClose asChild>
              <Button variant="ghost" className="absolute top-3 left-3 z-10" size="icon">
                <X />
                <span className="sr-only">Close</span>
              </Button>
            </BottomSheetClose>
            <Button
              type="button"
              variant="ghost"
              className="absolute top-3 right-3 z-10"
              size="icon"
              disabled={editDisabled}
              onClick={onEdit}
            >
              <Pencil />
              <span className="sr-only">Edit</span>
            </Button>
          </>
        ) : null}
        <BottomSheetHeader
          className={
            hasEditChrome ? 'space-y-1 px-14 pb-3 pt-10' : 'space-y-1 px-6 pb-3'
          }
        >
          <BottomSheetTitle
            id={labelledBy}
            className={RECEPTION_SHELL_TITLE_CLASS}
            title={accessibleTitleTooltip}
          >
            {accessibleTitle}
          </BottomSheetTitle>
          {header}
        </BottomSheetHeader>
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
  accessibleTitle,
  accessibleTitleTooltip,
  header,
  body,
  footer,
  titleId,
  onEdit,
  editDisabled,
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
        accessibleTitle={accessibleTitle}
        accessibleTitleTooltip={accessibleTitleTooltip}
        header={header}
        body={body}
        footer={footer}
        titleId={titleId}
        onEdit={onEdit}
        editDisabled={editDisabled}
      />
    );
  }

  return (
    <DesktopStayDetailDialog
      open
      onClose={onClose}
      accessibleTitle={accessibleTitle}
      accessibleTitleTooltip={accessibleTitleTooltip}
      header={header}
      body={body}
      footer={footer}
      titleId={titleId}
      onEdit={onEdit}
      editDisabled={editDisabled}
    />
  );
}
