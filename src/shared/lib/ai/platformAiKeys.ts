import 'server-only';

export type PlatformAiKeyStatus = {
  openrouterConfigured: boolean;
  geminiConfigured: boolean;
};

export function resolveOpenRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY?.trim() || undefined;
}

export function resolveGeminiApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    undefined
  );
}

export function getPlatformAiKeyStatus(): PlatformAiKeyStatus {
  return {
    openrouterConfigured: Boolean(resolveOpenRouterApiKey()),
    geminiConfigured: Boolean(resolveGeminiApiKey()),
  };
}
