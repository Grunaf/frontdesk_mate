export type PlatformAiProvider = 'openrouter' | 'gemini';

export type PlatformAiSettings = {
  provider: PlatformAiProvider;
  updatedAt: string | null;
};

export type GetPlatformAiSettingsResult =
  | { ok: true; settings: PlatformAiSettings }
  | { ok: false; error: 'db_unavailable' };

export type SetPlatformAiProviderResult =
  | { ok: true; settings: PlatformAiSettings }
  | { ok: false; error: 'db_unavailable' | 'invalid_provider' };
