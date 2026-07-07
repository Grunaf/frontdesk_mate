'use server';

import { isGuidedFillLlmConfigured } from '../lib/createGuidedFillLanguageModel';

export async function getGuidedFillLlmConfiguredAction(): Promise<boolean> {
  return isGuidedFillLlmConfigured();
}
