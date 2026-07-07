import 'server-only';

import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const DEFAULT_MODEL_ID = 'qwen/qwen3-next-80b-a3b-instruct:free';

/**
 * OpenRouter (OpenAI-compatible API). Set OPENROUTER_API_KEY.
 */
export function createGuidedFillLanguageModel(): LanguageModel | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const modelId = process.env.OPENROUTER_MODEL_ID?.trim() || DEFAULT_MODEL_ID;

  const openrouter = createOpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
  });

  return openrouter.chat(modelId);
}

export function isGuidedFillLlmConfigured(): boolean {
  return createGuidedFillLanguageModel() != null;
}
