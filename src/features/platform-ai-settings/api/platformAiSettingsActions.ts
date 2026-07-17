'use server';

import { revalidatePath } from 'next/cache';

import { assertAdminAuthenticated } from '@/app/admin/lib/adminSession';
import {
  getPlatformAiSettings,
  setPlatformAiProvider,
  type PlatformAiProvider,
  type PlatformAiSettings,
} from '@/entities/platform-ai-settings/server';
import {
  getPlatformAiKeyStatus,
  type PlatformAiKeyStatus,
} from '@/shared/lib/ai/platformAiKeys';

export type PlatformAiAdminSnapshot = {
  settings: PlatformAiSettings;
  keys: PlatformAiKeyStatus;
  activeProviderConfigured: boolean;
};

export type SavePlatformAiProviderResult =
  | { ok: true; settings: PlatformAiSettings }
  | { ok: false; error: 'unauthorized' | 'db_unavailable' | 'invalid_provider' };

export async function getPlatformAiAdminSnapshotAction(): Promise<PlatformAiAdminSnapshot> {
  await assertAdminAuthenticated();

  const result = await getPlatformAiSettings();
  const settings = result.ok
    ? result.settings
    : { provider: 'openrouter' as const, updatedAt: null };
  const keys = getPlatformAiKeyStatus();
  const activeProviderConfigured =
    settings.provider === 'gemini' ? keys.geminiConfigured : keys.openrouterConfigured;

  return { settings, keys, activeProviderConfigured };
}

export async function savePlatformAiProviderAction(
  provider: PlatformAiProvider
): Promise<SavePlatformAiProviderResult> {
  try {
    await assertAdminAuthenticated();
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  const result = await setPlatformAiProvider(provider);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath('/admin/ai');
  return { ok: true, settings: result.settings };
}
