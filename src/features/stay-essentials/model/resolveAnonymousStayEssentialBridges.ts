import { STAY_ESSENTIAL_BRIDGE_ORDER, type StayEssentialBridgeId } from './types';

export interface AnonymousStayEssentialBridgeInput {
  hasReceptionContent: boolean;
  hasContactContent: boolean;
}

export function resolveAnonymousStayEssentialBridgeIds(
  input: AnonymousStayEssentialBridgeInput
): StayEssentialBridgeId[] {
  const { hasReceptionContent, hasContactContent } = input;

  if (!hasReceptionContent && !hasContactContent) {
    return [];
  }

  return STAY_ESSENTIAL_BRIDGE_ORDER.filter((bridgeId) => {
    if (bridgeId === 'reception') {
      return hasReceptionContent;
    }

    if (bridgeId === 'contact') {
      return hasContactContent;
    }

    return false;
  });
}
