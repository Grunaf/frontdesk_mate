'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStaySetupStatusAction } from '@/features/guest-stay-contact';
import { resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import type { StaySetupInitialState } from '@/views/stay-setup';
import { isStaySetupRegistrationComplete } from '@/views/stay-setup/lib/resolveStaySetupSteps';
import type { RegistrationAccordionItem } from '../lib/resolveRegistrationAccordionItem';
import { resolveOpenRegistrationAccordionItem } from '../lib/resolveRegistrationAccordionItem';

type UseRegistrationStepStateInput = {
  initial: StaySetupInitialState;
  isRegistered: boolean;
  /** Refetch server status when mounted (arrival embed without server props). */
  syncFromServer?: boolean;
};

export function useRegistrationStepState({
  initial,
  isRegistered,
  syncFromServer = false,
}: UseRegistrationStepStateInput) {
  const { slug: tenantSlug, settings } = useTenant();
  const tourismRequired = resolveTourismRegistrationRequired(settings);

  const [tourismComplete, setTourismComplete] = useState(initial.tourismComplete);
  const [entryDateComplete, setEntryDateComplete] = useState(initial.entryDateComplete);
  const [entryStampDate, setEntryStampDate] = useState(initial.entryStampDate);
  const [contactComplete, setContactComplete] = useState(initial.contactComplete);
  const [passportVerified, setPassportVerified] = useState(initial.passportVerified);
  const [stayContactWhatsapp, setStayContactWhatsapp] = useState(initial.stayContactWhatsapp);
  const [contactDraftWhatsapp, setContactDraftWhatsapp] = useState(initial.stayContactWhatsapp ?? '');
  const [accordionValue, setAccordionValue] = useState<RegistrationAccordionItem>(() =>
    resolveOpenRegistrationAccordionItem({
      tourismRequired,
      tourismComplete: initial.tourismComplete,
      entryDateComplete: initial.entryDateComplete,
      contactComplete: initial.contactComplete,
    })
  );

  useEffect(() => {
    setTourismComplete(initial.tourismComplete);
    setEntryDateComplete(initial.entryDateComplete);
    setEntryStampDate(initial.entryStampDate);
    setContactComplete(initial.contactComplete);
    setPassportVerified(initial.passportVerified);
    setStayContactWhatsapp(initial.stayContactWhatsapp);
    setContactDraftWhatsapp(initial.stayContactWhatsapp ?? '');
  }, [
    initial.tourismComplete,
    initial.entryDateComplete,
    initial.entryStampDate,
    initial.contactComplete,
    initial.passportVerified,
    initial.stayContactWhatsapp,
  ]);

  useEffect(() => {
    if (!syncFromServer || !isRegistered || !tenantSlug) {
      return;
    }

    let cancelled = false;
    void getStaySetupStatusAction(tenantSlug).then((result) => {
      if (cancelled || !result.ok) {
        return;
      }

      setTourismComplete(result.status.tourismComplete);
      setEntryDateComplete(result.status.entryDateComplete);
      setEntryStampDate(result.status.entryStampDate);
      setContactComplete(result.status.contactComplete);
      setPassportVerified(result.status.passportVerified);
    });

    return () => {
      cancelled = true;
    };
  }, [syncFromServer, isRegistered, tenantSlug]);

  const completion = useMemo(
    () => ({
      tourismRequired,
      tourismComplete,
      entryDateComplete,
      contactComplete,
      passportVerified,
    }),
    [tourismRequired, tourismComplete, entryDateComplete, contactComplete, passportVerified]
  );

  const registrationComplete = isStaySetupRegistrationComplete(completion);

  const handleTourismComplete = useCallback(() => {
    setTourismComplete(true);
    setAccordionValue('entryDate');
  }, []);

  const handleEntryDateComplete = useCallback((savedDate: string | null) => {
    setEntryStampDate(savedDate);
    setEntryDateComplete(true);
    setAccordionValue('contact');
  }, []);

  const handleContactComplete = useCallback((savedWhatsapp: string) => {
    setStayContactWhatsapp(savedWhatsapp);
    setContactDraftWhatsapp(savedWhatsapp);
    setContactComplete(true);
  }, []);

  const applyRegistrationStatus = useCallback(
    (status: {
      tourismComplete: boolean;
      entryDateComplete: boolean;
      contactComplete: boolean;
      passportVerified?: boolean;
      entryStampDate?: string | null;
    }) => {
      setTourismComplete(status.tourismComplete);
      setEntryDateComplete(status.entryDateComplete);
      setContactComplete(status.contactComplete);
      if (status.passportVerified !== undefined) {
        setPassportVerified(status.passportVerified);
      }
      if (status.entryStampDate !== undefined) {
        setEntryStampDate(status.entryStampDate);
      }
    },
    []
  );

  return {
    tenantSlug,
    tourismRequired,
    tourismComplete,
    entryDateComplete,
    entryStampDate,
    contactComplete,
    passportVerified,
    stayContactWhatsapp,
    contactDraftWhatsapp,
    setContactDraftWhatsapp,
    completion,
    registrationComplete,
    accordionValue,
    setAccordionValue,
    handleTourismComplete,
    handleEntryDateComplete,
    handleContactComplete,
    applyRegistrationStatus,
  };
}
