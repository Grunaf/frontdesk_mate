import { SITE_CONFIG } from '@/shared/config';
import type { StaySetupStep } from '@/views/stay-setup/lib/resolveStaySetupSteps';
import {
  isStaySetupRegistrationComplete,
  resolveFirstIncompleteStaySetupStep,
  type StaySetupCompletion,
} from '@/views/stay-setup/lib/resolveStaySetupSteps';
import { resolveGuestRegistrationPath } from './resolveGuestRegistrationPath';

export function resolveGuestStaySetupPath(input: {
  locale: string;
  step?: StaySetupStep;
  tourismRequired: boolean;
  completion: StaySetupCompletion;
}): string {
  const step =
    input.step ??
    resolveFirstIncompleteStaySetupStep(input.tourismRequired, input.completion);

  if (step === 'registration') {
    const params = new URLSearchParams({ step: 'registration' });
    return `/${input.locale}${SITE_CONFIG.routes.app.staySetup.path}?${params.toString()}`;
  }

  const params = new URLSearchParams({ step });
  return `/${input.locale}${SITE_CONFIG.routes.app.staySetup.path}?${params.toString()}`;
}

export type StaySetupDeepLinkStep = StaySetupStep;

export function resolveStaySetupDeepLinkStep(input: {
  tourismRequired: boolean;
  tourismComplete: boolean;
  entryDateComplete: boolean;
  contactComplete: boolean;
  passportVerified: boolean;
  preferSettlement?: boolean;
}): StaySetupDeepLinkStep {
  const completion: StaySetupCompletion = {
    tourismRequired: input.tourismRequired,
    tourismComplete: input.tourismComplete,
    entryDateComplete: input.entryDateComplete,
    contactComplete: input.contactComplete,
    passportVerified: input.passportVerified,
  };

  if (!isStaySetupRegistrationComplete(completion) || !completion.passportVerified) {
    return 'registration';
  }

  if (input.preferSettlement) {
    return 'room';
  }

  return resolveFirstIncompleteStaySetupStep(input.tourismRequired, completion);
}

/** Standalone registration page (concierge pre-check-in, bookmarks). */
export function resolveGuestRegistrationDeepLinkPath(input: { locale: string }): string {
  return resolveGuestRegistrationPath(input);
}
