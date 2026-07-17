import 'server-only';

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

import { getPlatformAiSettings } from '@/entities/platform-ai-settings/server';
import type { PlatformAiProvider } from '@/entities/platform-ai-settings';
import {
  resolveGeminiApiKey,
  resolveOpenRouterApiKey,
} from '@/shared/lib/ai/platformAiKeys';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const DEFAULT_OPENROUTER_MODEL_ID = 'google/gemini-2.5-flash';
const DEFAULT_GEMINI_MODEL_ID = 'gemini-3.5-flash';

function resolveOpenRouterModelId(): string {
  return (
    process.env.STAFF_KNOWLEDGE_MODEL_ID?.trim() ||
    process.env.OPENROUTER_MODEL_ID?.trim() ||
    DEFAULT_OPENROUTER_MODEL_ID
  );
}

function resolveGeminiModelId(): string {
  return (
    process.env.STAFF_KNOWLEDGE_GEMINI_MODEL_ID?.trim() ||
    process.env.GEMINI_MODEL_ID?.trim() ||
    DEFAULT_GEMINI_MODEL_ID
  );
}

function createOpenRouterModel(): LanguageModel | null {
  const apiKey = resolveOpenRouterApiKey();
  if (!apiKey) return null;

  const openrouter = createOpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
  });

  return openrouter.chat(resolveOpenRouterModelId());
}

function createGeminiModel(): LanguageModel | null {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) return null;

  const google = createGoogleGenerativeAI({ apiKey });
  return google(resolveGeminiModelId());
}

export async function resolveStaffKnowledgeAiProvider(): Promise<PlatformAiProvider> {
  const result = await getPlatformAiSettings();
  if (!result.ok) {
    return 'openrouter';
  }
  return result.settings.provider;
}

/**
 * Builds the language model for the active platform AI provider.
 * Keys stay in env; provider preference comes from platform_ai_settings.
 */
export async function createStaffKnowledgeLanguageModel(): Promise<LanguageModel | null> {
  const provider = await resolveStaffKnowledgeAiProvider();
  if (provider === 'gemini') {
    return createGeminiModel();
  }
  return createOpenRouterModel();
}

export async function isStaffKnowledgeLlmConfigured(): Promise<boolean> {
  const model = await createStaffKnowledgeLanguageModel();
  return model != null;
}
