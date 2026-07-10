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
  const [contactComplete, setContactComplete] = useState(initial.contactComplete);
  const [stayContactWhatsapp, setStayContactWhatsapp] = useState(initial.stayContactWhatsapp);
  const [accordionValue, setAccordionValue] = useState<RegistrationAccordionItem>(() =>
    resolveOpenRegistrationAccordionItem({
      tourismRequired,
      tourismComplete: initial.tourismComplete,
      contactComplete: initial.contactComplete,
    })
  );

  useEffect(() => {
    setTourismComplete(initial.tourismComplete);
    setContactComplete(initial.contactComplete);
    setStayContactWhatsapp(initial.stayContactWhatsapp);
  }, [initial.tourismComplete, initial.contactComplete, initial.stayContactWhatsapp]);

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
      setContactComplete(result.status.contactComplete);
    });

    return () => {
      cancelled = true;
    };
  }, [syncFromServer, isRegistered, tenantSlug]);

  const completion = useMemo(
    () => ({
      tourismRequired,
      tourismComplete,
      contactComplete,
    }),
    [tourismRequired, tourismComplete, contactComplete]
  );

  const registrationComplete = isStaySetupRegistrationComplete(completion);

  const handleTourismComplete = useCallback(() => {
    setTourismComplete(true);
    setAccordionValue('contact');
  }, []);

  const handleContactComplete = useCallback((savedWhatsapp: string) => {
    setStayContactWhatsapp(savedWhatsapp);
    setContactComplete(true);
  }, []);

  return {
    tenantSlug,
    tourismRequired,
    tourismComplete,
    contactComplete,
    stayContactWhatsapp,
    completion,
    registrationComplete,
    accordionValue,
    setAccordionValue,
    handleTourismComplete,
    handleContactComplete,
  };
}
