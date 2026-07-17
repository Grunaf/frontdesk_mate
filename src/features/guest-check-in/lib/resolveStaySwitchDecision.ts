export type StaySwitchDecision = 'activate' | 'continue' | 'confirm';

/** Decide how to treat an incoming stay while a guest session may already exist. */
export function resolveStaySwitchDecision(input: {
  currentStayId: string | null | undefined;
  incomingStayId: string;
}): StaySwitchDecision {
  if (!input.currentStayId) return 'activate';
  if (input.currentStayId === input.incomingStayId) return 'continue';
  return 'confirm';
}
