import { getPlatformAiSettings } from '@/entities/platform-ai-settings/server';
import { PlatformAiSettingsForm } from '@/features/platform-ai-settings';
import { getPlatformAiKeyStatus } from '@/shared/lib/ai/platformAiKeys';

export default async function AdminAiSettingsPage() {
  const result = await getPlatformAiSettings();
  const settings = result.ok
    ? result.settings
    : { provider: 'openrouter' as const, updatedAt: null };
  const keys = getPlatformAiKeyStatus();
  const dbHint = result.ok
    ? null
    : 'Could not load platform_ai_settings (run migration 049). Defaulting to openrouter.';

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">AI provider</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose OpenRouter or direct Gemini for owner Staff knowledge Generate. Keys stay in
          environment variables.
        </p>
      </div>

      {dbHint ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {dbHint}
        </p>
      ) : null}

      <PlatformAiSettingsForm
        initialProvider={settings.provider}
        updatedAt={settings.updatedAt}
        openrouterConfigured={keys.openrouterConfigured}
        geminiConfigured={keys.geminiConfigured}
      />
    </div>
  );
}
