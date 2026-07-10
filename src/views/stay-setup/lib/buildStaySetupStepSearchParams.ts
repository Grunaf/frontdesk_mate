import type { StaySetupStep } from './resolveStaySetupSteps';

export function buildStaySetupStepSearchParams(
  step: StaySetupStep,
  existingSearch?: string
): string {
  const params = new URLSearchParams(existingSearch ?? '');
  params.set('step', step);
  return params.toString();
}
