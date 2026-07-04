import 'server-only';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

const DEFAULT_MODEL_ID = 'gemini-2.0-flash';

/**
 * Direct Gemini or optional AI Gateway (set AI_GATEWAY_API_KEY + AI_GATEWAY_BASE_URL).
 */
export function createGuidedFillLanguageModel(): LanguageModel | null {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const gatewayBase = process.env.AI_GATEWAY_BASE_URL?.trim();
  const geminiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  if (gatewayKey && gatewayBase) {
    const google = createGoogleGenerativeAI({
      apiKey: gatewayKey,
      baseURL: gatewayBase,
    });
    return google(DEFAULT_MODEL_ID);
  }

  if (!geminiKey) {
    return null;
  }

  const google = createGoogleGenerativeAI({ apiKey: geminiKey });
  return google(DEFAULT_MODEL_ID);
}

export function isGuidedFillLlmConfigured(): boolean {
  return createGuidedFillLanguageModel() != null;
}
