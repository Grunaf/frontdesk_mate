'use client';

import { useEffect, useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { resolveIsStayAdmitted } from '@/entities/guest-stay';
import {
  setKeyIssuedForReceptionAction,
  setPassportCheckedAction,
} from '@/features/guest-tourism-registration';
import {
  completeDeskCheckInAction,
  setDeskCheckedInForReceptionAction,
  unlockBedForReceptionAction,
} from '../actions/receptionActions';
import {
  canEditReceptionStayOccupancy,
  isReceptionStayPastCheckOut,
} from '../lib/canEditReceptionStayOccupancy';

export { canEditReceptionStayOccupancy, isReceptionStayPastCheckOut };

function mapAccessActionError(error: string): string {
  switch (error) {
    case 'unauthorized':
      return 'Sign in again at reception desk.';
    case 'forbidden':
      return 'You do not have permission to skip the tourism gate.';
    case 'tourism_incomplete':
      return 'Complete tourism registration and upload passport photos before check-in.';
    case 'missing_documents':
      return 'Upload a passport photo for each guest before check-in.';
    case 'bed_not_ready':
      return 'Mark the bed as ready in Cleaning before check-in.';
    default:
      return 'Could not update access status.';
  }
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
  const [deskCheckedInAt, setDeskCheckedInAt] = useState(stay.desk_checked_in_at);
  const [bedUnlockedAt, setBedUnlockedAt] = useState(stay.bed_unlocked_at);
  const [keyIssued, setKeyIssued] = useState(Boolean(stay.key_issued_at));
  const accessGranted = resolveIsStayAdmitted({
    passport_checked_at: passportCheckedAt,
    desk_checked_in_at: deskCheckedInAt,
  });

  useEffect(() => {
    setPassportCheckedAt(stay.passport_checked_at);
    setDeskCheckedInAt(stay.desk_checked_in_at);
    setBedUnlockedAt(stay.bed_unlocked_at);
    setKeyIssued(Boolean(stay.key_issued_at));
    setActionError(null);
  }, [
    stay.passport_checked_at,
    stay.desk_checked_in_at,
    stay.bed_unlocked_at,
    stay.key_issued_at,
    stay.id,
  ]);

  const applyStayUpdate = (next: {
    passport_checked_at: string | null;
    key_issued_at: string | null;
    desk_checked_in_at?: string | null;
    bed_unlocked_at?: string | null;
  } & Partial<GuestStayRecordWithLink>) => {
    setPassportCheckedAt(next.passport_checked_at);
    if (next.desk_checked_in_at !== undefined) {
      setDeskCheckedInAt(next.desk_checked_in_at);
    }
    if (next.bed_unlocked_at !== undefined) {
      setBedUnlockedAt(next.bed_unlocked_at);
    }
    setKeyIssued(Boolean(next.key_issued_at));
    onStayUpdated?.({
      ...stay,
      ...next,
      magicLinkUrl: stay.magicLinkUrl,
    });
  };

  const setPassportChecked = (checked: boolean) => {
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
      });
      if (!result.ok) {
        setActionError(mapAccessActionError(result.error));
        return;
      }
      applyStayUpdate(result.stay);
    });
  };

  const setDeskCheckedIn = (checked: boolean, options?: { bypassAccessGate?: boolean }) => {
    if (!tenantSlug) {
      setActionError('Stay actions unavailable.');
      return;
    }
    startAction(async () => {
      setActionError(null);
      if (checked) {
        const result = await completeDeskCheckInAction({
          tenantSlug,
          stayId: stay.id,
          keyIssued,
          bypassAccessGate: options?.bypassAccessGate,
        });
        if (!result.ok) {
          setActionError(mapAccessActionError(result.error));
          return;
        }
        applyStayUpdate(result.stay);
        return;
      }
      const result = await setDeskCheckedInForReceptionAction({
        tenantSlug,
        stayId: stay.id,
        checked: false,
      });
      if (!result.ok) {
        setActionError(mapAccessActionError(result.error));
        return;
      }
      applyStayUpdate(result.stay);
    });
  };

  const unlockBed = () => {
    if (!tenantSlug) {
      setActionError('Stay actions unavailable.');
      return;
    }
    startAction(async () => {
      setActionError(null);
      const result = await unlockBedForReceptionAction({
        tenantSlug,
        stayId: stay.id,
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
    passportChecked: Boolean(passportCheckedAt),
    passportCheckedAt,
    bedUnlockedAt,
    keyIssued,
    actionError,
    isPending,
    setKeyIssuedChecked,
    setPassportChecked,
    checkIn: (options?: { bypassAccessGate?: boolean }) => setDeskCheckedIn(true, options),
    revokeAccess: () => setDeskCheckedIn(false),
    unlockBed,
  };
}
