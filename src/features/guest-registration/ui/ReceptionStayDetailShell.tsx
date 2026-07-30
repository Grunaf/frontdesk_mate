'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
import { cn } from '@/shared/lib/utils';

export const RECEPTION_STAY_DETAIL_TITLE_ID = 'reception-stay-detail-title';
export const RECEPTION_ISSUE_ACCESS_TITLE_ID = 'reception-issue-access-title';

const RECEPTION_SHELL_TITLE_CLASS = 'text-base font-semibold leading-tight';

/** Matches desktop stay dialog breakpoint (`lg` = 1024px). */
export function useIsReceptionStayDetailBelowLg(): boolean {
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
  /**
   * Mobile nav control (e.g. party Back). When set without edit chrome,
   * rendered in a dedicated nav row with Close on the same line.
   */
  titleLeading?: ReactNode;
  /** Optional icon/prefix inline before the title text. */
  titlePrefix?: ReactNode;
  /** Optional trailing control beside the title (e.g. status badge). */
  titleTrailing?: ReactNode;
  header: ReactNode;
  body: ReactNode;
  footer: ReactNode;
  /**
   * Sticky region above the scrollable body (e.g. stay-detail tabs).
   * Does not scroll with {@link body}.
   */
  bodyTop?: ReactNode;
  /**
   * Wraps sticky {@link bodyTop} + scrollable body (not header/footer).
   * Use for Tabs / stack slide so the sheet/dialog root never remounts.
   * Prefer `className="contents"` on the wrapper when it must not break flex layout,
   * or return a `flex min-h-0 flex-1 flex-col` column.
   */
  wrapBodyRegion?: (region: ReactNode) => ReactNode;
  /**
   * Desktop only: panel to the left of the stay dialog (e.g. party peek).
   * Ignored on mobile bottom sheet.
   */
  sidePanel?: ReactNode;
  /** Defaults to {@link RECEPTION_STAY_DETAIL_TITLE_ID}. */
  titleId?: string;
  /**
   * When set, stay-detail chrome shows Edit (pencil).
   * Mobile: in-flow toolbar — close left, pencil (+ optional overflow) right.
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

/** Shared horizontal inset for mobile stay sheet chrome + tabs + body + footer. */
const MOBILE_STAY_SHEET_INSET_X = 'px-4';

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
  titleLeading,
  titlePrefix,
  titleTrailing,
  header,
  body,
  bodyTop,
  wrapBodyRegion,
  footer,
  sidePanel,
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

  const bodyRegion = (
    <>
      {bodyTop ? (
        <div className="shrink-0 border-b border-border/60 px-6 pt-3 pb-2">{bodyTop}</div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">{body}</div>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center gap-3 overflow-x-auto bg-black/40 p-4"
      onClick={() => {
        if (!dismissBlocked) onClose();
      }}
      role="presentation"
    >
      {sidePanel ? (
        <div
          className="h-[min(90vh,800px)] max-h-[min(90vh,800px)] shrink-0"
          onClick={(event) => event.stopPropagation()}
        >
          {sidePanel}
        </div>
      ) : null}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="flex h-[min(90vh,800px)] max-h-[min(90vh,800px)] w-full max-w-3xl min-w-0 flex-col overflow-hidden rounded-xl border bg-background shadow-lg outline-none"
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
          <div className="space-y-2">
            {titleLeading ? <div className="pr-10">{titleLeading}</div> : null}
            <div className="space-y-1">
              <h2
                id={labelledBy}
                className={cn(
                  RECEPTION_SHELL_TITLE_CLASS,
                  (titlePrefix || titleTrailing) && 'flex min-w-0 items-center gap-1.5'
                )}
                title={accessibleTitleTooltip}
              >
                {titlePrefix}
                <span className="min-w-0 truncate">{accessibleTitle}</span>
                {titleTrailing}
              </h2>
              {header}
            </div>
          </div>
        </div>

        {wrapBodyRegion ? wrapBodyRegion(bodyRegion) : bodyRegion}

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
  titleLeading,
  titlePrefix,
  titleTrailing,
  header,
  body,
  bodyTop,
  wrapBodyRegion,
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
  const hasTitleLeading = Boolean(titleLeading);
  /** Back + Close on one row under the drag handle (party stack). */
  const useNavRow = hasTitleLeading && !hasEditChrome;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && dismissBlocked) return;
      if (!nextOpen) onClose();
    },
    [dismissBlocked, onClose]
  );

  const closeButton = (
    <BottomSheetClose asChild>
      <Button variant="ghost" size="icon" className="shrink-0">
        <X />
        <span className="sr-only">Close</span>
      </Button>
    </BottomSheetClose>
  );

  const bodyRegion = (
    <>
      {bodyTop ? (
        <div
          className={cn(
            'shrink-0 border-b border-border/60 pt-1 pb-2',
            MOBILE_STAY_SHEET_INSET_X
          )}
        >
          {bodyTop}
        </div>
      ) : null}
      <BottomSheetBody className={cn('space-y-4 pb-4', MOBILE_STAY_SHEET_INSET_X)}>
        {body}
      </BottomSheetBody>
    </>
  );

  return (
    <BottomSheet open={open} onOpenChange={handleOpenChange}>
      <BottomSheetContent
        size={BOTTOM_SHEET_SIZES.large}
        className="flex flex-col px-0 pb-0"
        aria-describedby={undefined}
        showCloseButton={false}
        onPointerDownOutside={(event) => {
          if (dismissBlocked) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (dismissBlocked) event.preventDefault();
        }}
      >
        {/* In-flow chrome row: same inset as title / tabs / body (no absolute close). */}
        <div
          className={cn(
            'flex shrink-0 items-center justify-between gap-2 pb-0.5',
            MOBILE_STAY_SHEET_INSET_X
          )}
        >
          <div className="flex min-w-0 items-center">
            {hasEditChrome ? closeButton : useNavRow ? titleLeading : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {hasEditChrome ? (
              <>
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
              </>
            ) : (
              closeButton
            )}
          </div>
        </div>
        <BottomSheetHeader className={cn('space-y-1 pb-3 pt-1', MOBILE_STAY_SHEET_INSET_X)}>
          {titleLeading && hasEditChrome ? <div className="mb-2">{titleLeading}</div> : null}
          <BottomSheetTitle
            className={cn(
              RECEPTION_SHELL_TITLE_CLASS,
              (titlePrefix || titleTrailing) && 'flex min-w-0 items-center gap-1.5'
            )}
            title={accessibleTitleTooltip}
          >
            {titlePrefix}
            <span className="min-w-0 truncate">{accessibleTitle}</span>
            {titleTrailing}
          </BottomSheetTitle>
          {header}
        </BottomSheetHeader>
        {wrapBodyRegion ? wrapBodyRegion(bodyRegion) : bodyRegion}
        {footer ? (
          <BottomSheetFooter
            className={cn(
              'border-t border-border/60 pb-[max(1rem,env(safe-area-inset-bottom))]',
              MOBILE_STAY_SHEET_INSET_X
            )}
          >
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
  titleLeading,
  titlePrefix,
  titleTrailing,
  header,
  body,
  bodyTop,
  wrapBodyRegion,
  footer,
  sidePanel,
  titleId,
  onEdit,
  editDisabled,
  headerExtra,
  headerOverflow,
  dismissBlocked,
}: ReceptionStayDetailShellProps) {
  const isBelowLg = useIsReceptionStayDetailBelowLg();

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
        titleLeading={titleLeading}
        titlePrefix={titlePrefix}
        titleTrailing={titleTrailing}
        header={header}
        body={body}
        bodyTop={bodyTop}
        wrapBodyRegion={wrapBodyRegion}
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
      titleLeading={titleLeading}
      titlePrefix={titlePrefix}
      titleTrailing={titleTrailing}
      header={header}
      body={body}
      bodyTop={bodyTop}
      wrapBodyRegion={wrapBodyRegion}
      footer={footer}
      sidePanel={sidePanel}
      titleId={titleId}
      onEdit={onEdit}
      editDisabled={editDisabled}
      headerExtra={headerExtra}
      headerOverflow={headerOverflow}
      dismissBlocked={dismissBlocked}
    />
  );
}
