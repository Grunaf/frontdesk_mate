'use client';

import { useState, useTransition } from 'react';

import type { PlatformAiProvider, PlatformAiSettings } from '@/entities/platform-ai-settings';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';

import { savePlatformAiProviderAction } from '../api/platformAiSettingsActions';

type PlatformAiSettingsFormProps = {
  initialProvider: PlatformAiProvider;
  updatedAt: string | null;
  openrouterConfigured: boolean;
  geminiConfigured: boolean;
};

function statusLabel(configured: boolean): string {
  return configured ? 'Key set in env' : 'Key missing';
}

export function PlatformAiSettingsForm({
  initialProvider,
  updatedAt,
  openrouterConfigured,
  geminiConfigured,
}: PlatformAiSettingsFormProps) {
  const [provider, setProvider] = useState<PlatformAiProvider>(initialProvider);
  const [saved, setSaved] = useState<PlatformAiSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await savePlatformAiProviderAction(provider);
      if (!result.ok) {
        if (result.error === 'unauthorized') {
          setError('Sign in again to continue.');
          return;
        }
        if (result.error === 'invalid_provider') {
          setError('Invalid provider.');
          return;
        }
        setError('Could not save. Check database / migrations.');
        return;
      }
      setSaved(result.settings);
    });
  };

  const displayUpdatedAt = saved?.updatedAt ?? updatedAt;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Provider for Staff knowledge Generate</Label>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <input
              type="radio"
              name="platform-ai-provider"
              className="mt-1"
              checked={provider === 'openrouter'}
              disabled={pending}
              onChange={() => setProvider('openrouter')}
            />
            <span>
              <span className="block text-sm font-medium">OpenRouter</span>
              <span className="block text-xs text-muted-foreground">
                Uses OPENROUTER_API_KEY · {statusLabel(openrouterConfigured)}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <input
              type="radio"
              name="platform-ai-provider"
              className="mt-1"
              checked={provider === 'gemini'}
              disabled={pending}
              onChange={() => setProvider('gemini')}
            />
            <span>
              <span className="block text-sm font-medium">Google Gemini (direct)</span>
              <span className="block text-xs text-muted-foreground">
                Uses GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY ·{' '}
                {statusLabel(geminiConfigured)}
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={pending} onClick={handleSave}>
          {pending ? 'Saving…' : 'Save provider'}
        </Button>
        {displayUpdatedAt ? (
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(displayUpdatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      {saved ? (
        <p className="text-sm text-muted-foreground">
          Saved — active provider: <span className="font-medium">{saved.provider}</span>
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <p className="text-xs text-muted-foreground">
        API keys are never stored in the admin UI. Set them in env / Vercel. Model ids:
        STAFF_KNOWLEDGE_MODEL_ID (OpenRouter) or STAFF_KNOWLEDGE_GEMINI_MODEL_ID (Gemini).
      </p>
    </div>
  );
}
