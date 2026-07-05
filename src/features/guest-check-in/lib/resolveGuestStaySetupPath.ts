import { SITE_CONFIG } from '@/shared/config';
import type { StaySetupStep } from '@/views/stay-setup/lib/resolveStaySetupSteps';
import {
  resolveFirstIncompleteStaySetupStep,
  type StaySetupCompletion,
} from '@/views/stay-setup/lib/resolveStaySetupSteps';

export function resolveGuestStaySetupPath(input: {
  locale: string;
  step?: StaySetupStep;
  tourismRequired: boolean;
  completion: StaySetupCompletion;
}): string {
  const step =
    input.step ??
    resolveFirstIncompleteStaySetupStep(input.tourismRequired, input.completion);

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
  if (input.preferSettlement) {
    if (input.tourismRequired && !input.tourismComplete) {
      return 'register';
    }
    if (!input.contactComplete) {
      return 'contact';
    }
    return 'settlement';
  }

  return resolveFirstIncompleteStaySetupStep(input.tourismRequired, {
    tourismRequired: input.tourismRequired,
    tourismComplete: input.tourismComplete,
    contactComplete: input.contactComplete,
  });
}
