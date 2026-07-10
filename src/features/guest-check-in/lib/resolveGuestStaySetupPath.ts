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
    return resolveGuestRegistrationPath({ locale: input.locale });
  }

  const params = new URLSearchParams({ step });
  return `/${input.locale}${SITE_CONFIG.routes.app.staySetup.path}?${params.toString()}`;
}

export type StaySetupDeepLinkStep = StaySetupStep;

export function resolveStaySetupDeepLinkStep(input: {
  tourismRequired: boolean;
  tourismComplete: boolean;
  contactComplete: boolean;
  preferSettlement?: boolean;
}): StaySetupDeepLinkStep {
  const completion: StaySetupCompletion = {
    tourismRequired: input.tourismRequired,
    tourismComplete: input.tourismComplete,
    contactComplete: input.contactComplete,
  };

  if (!isStaySetupRegistrationComplete(completion)) {
    return 'registration';
  }

  if (input.preferSettlement) {
    return 'room';
  }

  return resolveFirstIncompleteStaySetupStep(input.tourismRequired, completion);
}
