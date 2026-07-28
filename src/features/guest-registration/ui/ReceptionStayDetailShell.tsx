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
  /**
   * Sticky region above the scrollable body (e.g. stay-detail tabs).
   * Does not scroll with {@link body}.
   */
  bodyTop?: ReactNode;
  /** Defaults to {@link RECEPTION_STAY_DETAIL_TITLE_ID}. */
  titleId?: string;
  /**
   * When set, stay-detail chrome shows Edit (pencil).
   * Mobile: close on the left; pencil (+ optional overflow) on the right.
   * Desktop: pencil left of overflow/close (close stays top-right).
   */
  onEdit?: () => void;
  editDisabled?: boolean;
  /** Between pencil and overflow (e.g. desk QR shortcut). */
  headerExtra?: ReactNode;
  /** Rendered to the right of the pencil / headerExtra (e.g. vertical ⋮ overflow menu). */
  headerOverflow?: ReactNode;
  /**
   * When true, ignore outside-click / Escape dismiss (e.g. nested ConfirmDialog open).
   * Explicit header Close still calls {@link onClose} — parent should no-op if needed.
   */
  dismissBlocked?: boolean;
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

/** Desktop: close is always present; `leadingCount` = edit + extra + overflow. */
function desktopHeaderActionsPaddingClass(leadingCount: number): string {
  if (leadingCount >= 3) return 'pr-40';
  if (leadingCount === 2) return 'pr-32';
  if (leadingCount === 1) return 'pr-24';
  return 'pr-14';
}

function mobileHeaderPaddingClass(leadingCount: number): string {
  if (leadingCount >= 3) return 'space-y-1 px-14 pb-3 pt-10 pr-36';
  if (leadingCount === 2) return 'space-y-1 px-14 pb-3 pt-10 pr-28';
  if (leadingCount === 1) return 'space-y-1 px-14 pb-3 pt-10';
  return 'space-y-1 px-6 pb-3';
}

function countLeadingHeaderActions(input: {
  onEdit?: () => void;
  headerExtra?: ReactNode;
  headerOverflow?: ReactNode;
}): number {
  return (
    (input.onEdit ? 1 : 0) +
    (input.headerExtra ? 1 : 0) +
    (input.headerOverflow ? 1 : 0)
  );
}

function DesktopStayDetailDialog({
  open,
  onClose,
  accessibleTitle,
  accessibleTitleTooltip,
  header,
  body,
  bodyTop,
  footer,
  titleId = RECEPTION_STAY_DETAIL_TITLE_ID,
  onEdit,
  editDisabled = false,
  headerExtra,
  headerOverflow,
  dismissBlocked = false,
}: ReceptionStayDetailShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const labelledBy = titleId;
  const leadingCount = countLeadingHeaderActions({ onEdit, headerExtra, headerOverflow });

  useCloseOnEscape(open && !dismissBlocked, onClose);

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
      onClick={() => {
        if (!dismissBlocked) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="flex h-[min(90vh,800px)] max-h-[min(90vh,800px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-background shadow-lg outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`relative shrink-0 border-b border-border/60 px-6 py-4 ${desktopHeaderActionsPaddingClass(leadingCount)}`}
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
            {headerExtra}
            {headerOverflow}
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

        {bodyTop ? (
          <div className="shrink-0 border-b border-border/60 px-6 pt-3 pb-2">{bodyTop}</div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">{body}</div>

        {footer ? (
          <div className="shrink-0 border-t border-border/60 px-6 py-4">{footer}</div>
        ) : null}
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
  bodyTop,
  footer,
  onEdit,
  editDisabled = false,
  headerExtra,
  headerOverflow,
  dismissBlocked = false,
}: ReceptionStayDetailShellProps) {
  // Do not pass a custom `id` to BottomSheetTitle / aria-labelledby here:
  // Vaul→Radix Dialog owns titleId; overriding it triggers DialogTitle a11y warnings.
  const leadingCount = countLeadingHeaderActions({ onEdit, headerExtra, headerOverflow });
  const hasEditChrome = leadingCount > 0;

  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && dismissBlocked) return;
        if (!nextOpen) onClose();
      }}
    >
      <BottomSheetContent
        size={BOTTOM_SHEET_SIZES.large}
        className="flex flex-col px-0 pb-0"
        aria-describedby={undefined}
        showCloseButton={!hasEditChrome}
        onPointerDownOutside={(event) => {
          if (dismissBlocked) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (dismissBlocked) event.preventDefault();
        }}
      >
        {hasEditChrome ? (
          <>
            <BottomSheetClose asChild>
              <Button variant="ghost" className="absolute top-3 left-3 z-10" size="icon">
                <X />
                <span className="sr-only">Close</span>
              </Button>
            </BottomSheetClose>
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
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
              {headerExtra}
              {headerOverflow}
            </div>
          </>
        ) : null}
        <BottomSheetHeader className={mobileHeaderPaddingClass(leadingCount)}>
          <BottomSheetTitle
            className={RECEPTION_SHELL_TITLE_CLASS}
            title={accessibleTitleTooltip}
          >
            {accessibleTitle}
          </BottomSheetTitle>
          {header}
        </BottomSheetHeader>
        {bodyTop ? (
          <div className="shrink-0 border-b border-border/60 px-6 pt-1 pb-2">{bodyTop}</div>
        ) : null}
        <BottomSheetBody className="space-y-4 pb-4">{body}</BottomSheetBody>
        {footer ? (
          <BottomSheetFooter className="border-t border-border/60 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </BottomSheetFooter>
        ) : null}
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
  bodyTop,
  footer,
  titleId,
  onEdit,
  editDisabled,
  headerExtra,
  headerOverflow,
  dismissBlocked,
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
        bodyTop={bodyTop}
        footer={footer}
        titleId={titleId}
        onEdit={onEdit}
        editDisabled={editDisabled}
        headerExtra={headerExtra}
        headerOverflow={headerOverflow}
        dismissBlocked={dismissBlocked}
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
      bodyTop={bodyTop}
      footer={footer}
      titleId={titleId}
      onEdit={onEdit}
      editDisabled={editDisabled}
      headerExtra={headerExtra}
      headerOverflow={headerOverflow}
      dismissBlocked={dismissBlocked}
    />
  );
}
