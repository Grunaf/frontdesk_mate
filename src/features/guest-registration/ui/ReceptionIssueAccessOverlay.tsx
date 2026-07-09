'use client';

import type { GuestAccessFormMode } from '../lib/guestAccessDates';
import {
  IssueGuestAccessFormFields,
  resolveIssueGuestAccessSubmitLabel,
  type IssueGuestAccessFormProps,
} from './IssueGuestAccessForm';
import {
  RECEPTION_ISSUE_ACCESS_TITLE_ID,
  ReceptionStayDetailShell,
} from './ReceptionStayDetailShell';
import { Button } from '@/shared/ui';

type ReceptionIssueAccessOverlayProps = Omit<IssueGuestAccessFormProps, 'layout'> & {
  open: boolean;
  onClose: () => void;
  mode: GuestAccessFormMode;
};

function IssueAccessOverlayHeader({
  isEditingReservation,
  editIntent,
  reissueGuestLabel,
}: {
  isEditingReservation: boolean;
  editIntent?: 'moveBed' | 'changeDates';
  reissueGuestLabel?: string;
}) {
  const subtitle =
    isEditingReservation && reissueGuestLabel
      ? editIntent === 'moveBed'
        ? `Moving ${reissueGuestLabel} — PIN and link stay the same.`
        : `Editing ${reissueGuestLabel} — PIN and link stay the same.`
      : isEditingReservation
        ? editIntent === 'moveBed'
          ? 'Moving guest — PIN and link stay the same.'
          : 'Editing guest — PIN and link stay the same.'
        : null;

  return (
    <div className="space-y-1 pr-2">
      <h2
        id={RECEPTION_ISSUE_ACCESS_TITLE_ID}
        className="text-base font-semibold"
        title="App access only — not your booking system"
      >
        Issue guest access
      </h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function ReceptionIssueAccessOverlay({
  open,
  onClose,
  onCancelReissue,
  isEditingReservation = false,
  isPending,
  rangeValid,
  canSubmit,
  isReissue,
  onSubmit,
  ...fieldsProps
}: ReceptionIssueAccessOverlayProps) {
  const { mode, editIntent, reissueGuestLabel } = fieldsProps;

  const submitLabel = resolveIssueGuestAccessSubmitLabel({
    isPending,
    isEditingReservation,
    isReissue,
  });

  const handleCancel = () => {
    if (onCancelReissue) {
      onCancelReissue();
    } else {
      onClose();
    }
  };

  return (
    <ReceptionStayDetailShell
      open={open}
      onClose={onClose}
      titleId={RECEPTION_ISSUE_ACCESS_TITLE_ID}
      header={
        <IssueAccessOverlayHeader
          isEditingReservation={isEditingReservation}
          editIntent={editIntent}
          reissueGuestLabel={reissueGuestLabel}
        />
      }
      body={
        <IssueGuestAccessFormFields
          layout="shell"
          isEditingReservation={isEditingReservation}
          onCancelReissue={onCancelReissue}
          {...fieldsProps}
        />
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {isEditingReservation ? (
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            className="sm:min-w-[10rem]"
            onClick={onSubmit}
            disabled={isPending || !canSubmit || (mode === 'custom' && !rangeValid)}
          >
            {submitLabel}
          </Button>
        </div>
      }
    />
  );
}
