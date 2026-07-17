import 'server-only';

import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/shared/lib/db/admin';

import type {
  GetPlatformAiSettingsResult,
  PlatformAiProvider,
  PlatformAiSettings,
  SetPlatformAiProviderResult,
} from '../model/types';

const DEFAULT_SETTINGS: PlatformAiSettings = {
  provider: 'openrouter',
  updatedAt: null,
};

function isProvider(value: unknown): value is PlatformAiProvider {
  return value === 'openrouter' || value === 'gemini';
}

function mapRow(row: Record<string, unknown>): PlatformAiSettings {
  const provider = isProvider(row.provider) ? row.provider : 'openrouter';
  return {
    provider,
    updatedAt: row.updated_at != null ? String(row.updated_at) : null,
  };
}

export async function getPlatformAiSettings(): Promise<GetPlatformAiSettingsResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: 'db_unavailable' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { data, error } = await supabase
    .from('platform_ai_settings')
    .select('provider, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('getPlatformAiSettings', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: true, settings: DEFAULT_SETTINGS };
  }

  return { ok: true, settings: mapRow(data as Record<string, unknown>) };
}

export async function setPlatformAiProvider(
  provider: PlatformAiProvider
): Promise<SetPlatformAiProviderResult> {
  if (!isProvider(provider)) {
    return { ok: false, error: 'invalid_provider' };
  }

  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: 'db_unavailable' };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: 'db_unavailable' };
  }

  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('platform_ai_settings')
    .upsert(
      { id: 1, provider, updated_at: updatedAt },
      { onConflict: 'id' }
    )
    .select('provider, updated_at')
    .single();

  if (error || !data) {
    console.error('setPlatformAiProvider', error?.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, settings: mapRow(data as Record<string, unknown>) };
}
