'use client';

import { useEffect, useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { stayRecordCheckOutDate } from '@/entities/guest-stay';
import {
  setKeyIssuedForReceptionAction,
  setPassportCheckedAction,
} from '@/features/guest-tourism-registration';

function mapAccessActionError(error: string): string {
  switch (error) {
    case 'unauthorized':
      return 'Sign in again at reception desk.';
    case 'forbidden':
      return 'You do not have permission to skip the tourism gate.';
    case 'tourism_incomplete':
      return 'Complete tourism registration and upload passport photos before granting access.';
    case 'missing_documents':
      return 'Upload a passport photo for each guest before granting access.';
    default:
      return 'Could not update access status.';
  }
}

/** Past exclusive check-out day or archived — block live mutate (edit/grant/tourism/reissue). */
export function isReceptionStayPastCheckOut(
  stay: Pick<GuestStayRecordWithLink, 'is_archived' | 'check_out_date' | 'check_out_at'>,
  operationalDate: string
): boolean {
  return Boolean(stay.is_archived) || operationalDate >= stayRecordCheckOutDate(stay);
}

export function useStayAccessControls({
  stay,
  tenantSlug,
  onStayUpdated,
}: {
  stay: GuestStayRecordWithLink;
  tenantSlug: string;
  onStayUpdated?: (stay: GuestStayRecordWithLink) => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startAction] = useTransition();
  const [passportCheckedAt, setPassportCheckedAt] = useState(stay.passport_checked_at);
  const [keyIssued, setKeyIssued] = useState(Boolean(stay.key_issued_at));
  const accessGranted = Boolean(passportCheckedAt);

  useEffect(() => {
    setPassportCheckedAt(stay.passport_checked_at);
    setKeyIssued(Boolean(stay.key_issued_at));
    setActionError(null);
  }, [stay.passport_checked_at, stay.key_issued_at, stay.id]);

  const applyStayUpdate = (next: {
    passport_checked_at: string | null;
    key_issued_at: string | null;
    desk_checked_in_at?: string | null;
  } & Partial<GuestStayRecordWithLink>) => {
    setPassportCheckedAt(next.passport_checked_at);
    setKeyIssued(Boolean(next.key_issued_at));
    onStayUpdated?.({
      ...stay,
      ...next,
      magicLinkUrl: stay.magicLinkUrl,
    });
  };

  const setAccess = (checked: boolean, options?: { bypassAccessGate?: boolean }) => {
    if (!tenantSlug) {
      setActionError('Stay actions unavailable.');
      return;
    }
    startAction(async () => {
      setActionError(null);
      const result = await setPassportCheckedAction({
        tenantSlug,
        stayId: stay.id,
        checked,
        keyIssued: checked ? keyIssued : undefined,
        bypassAccessGate: options?.bypassAccessGate,
      });
      if (!result.ok) {
        setActionError(mapAccessActionError(result.error));
        return;
      }
      applyStayUpdate(result.stay);
    });
  };

  const setKeyIssuedChecked = (nextKeyIssued: boolean) => {
    if (!accessGranted) {
      setKeyIssued(nextKeyIssued);
      return;
    }
    if (!tenantSlug) {
      setActionError('Stay actions unavailable.');
      return;
    }
    startAction(async () => {
      setActionError(null);
      const result = await setKeyIssuedForReceptionAction({
        tenantSlug,
        stayId: stay.id,
        keyIssued: nextKeyIssued,
      });
      if (!result.ok) {
        setActionError(mapAccessActionError(result.error));
        return;
      }
      applyStayUpdate(result.stay);
    });
  };

  return {
    accessGranted,
    keyIssued,
    actionError,
    isPending,
    setKeyIssuedChecked,
    grantAccess: (options?: { bypassAccessGate?: boolean }) => setAccess(true, options),
    revokeAccess: () => setAccess(false),
  };
}
