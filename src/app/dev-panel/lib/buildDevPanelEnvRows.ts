export type DevPanelEnvEffective = 'set' | 'fallback' | 'missing';

export interface DevPanelEnvRow {
  key: string;
  effective: DevPanelEnvEffective;
  note?: string;
}

function envTrim(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function resolveSupabaseServerKey(): DevPanelEnvEffective {
  if (envTrim('SUPABASE_SECRET_KEY') || envTrim('SUPABASE_SERVICE_ROLE_KEY')) {
    return 'set';
  }
  return 'missing';
}

function resolveSupabaseSecretKeyRow(): DevPanelEnvRow {
  if (envTrim('SUPABASE_SECRET_KEY')) {
    return { key: 'SUPABASE_SECRET_KEY', effective: 'set' };
  }
  if (envTrim('SUPABASE_SERVICE_ROLE_KEY')) {
    return {
      key: 'SUPABASE_SECRET_KEY',
      effective: 'fallback',
      note: 'via SUPABASE_SERVICE_ROLE_KEY',
    };
  }
  return { key: 'SUPABASE_SECRET_KEY', effective: 'missing' };
}

function resolveSupabaseServiceRoleKeyRow(): DevPanelEnvRow {
  if (envTrim('SUPABASE_SERVICE_ROLE_KEY')) {
    return { key: 'SUPABASE_SERVICE_ROLE_KEY', effective: 'set' };
  }
  if (envTrim('SUPABASE_SECRET_KEY')) {
    return {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      effective: 'fallback',
      note: 'via SUPABASE_SECRET_KEY (preferred name)',
    };
  }
  return { key: 'SUPABASE_SERVICE_ROLE_KEY', effective: 'missing' };
}

function resolveAdminFallbackRow(
  key: 'GUEST_SESSION_SECRET' | 'RECEPTION_SESSION_SECRET' | 'DEV_PANEL_SECRET'
): DevPanelEnvRow {
  if (envTrim(key)) {
    return { key, effective: 'set' };
  }
  if (envTrim('ADMIN_SECRET')) {
    return { key, effective: 'fallback', note: 'via ADMIN_SECRET' };
  }
  return { key, effective: 'missing' };
}

const PLAIN_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'DATABASE_URL',
  'ADMIN_SECRET',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'NEXT_PUBLIC_TENANT_SLUG',
  'NEXT_PUBLIC_BASE_DOMAIN',
  'NEXT_PUBLIC_CITY_PACK_ID',
] as const;

const SPECIAL_ENV_KEYS = new Set([
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GUEST_SESSION_SECRET',
  'RECEPTION_SESSION_SECRET',
  'DEV_PANEL_SECRET',
]);

function resolvePlainRow(key: string): DevPanelEnvRow {
  return envTrim(key)
    ? { key, effective: 'set' }
    : { key, effective: 'missing' };
}

function resolveSpecialRow(key: string): DevPanelEnvRow {
  switch (key) {
    case 'SUPABASE_SECRET_KEY':
      return resolveSupabaseSecretKeyRow();
    case 'SUPABASE_SERVICE_ROLE_KEY':
      return resolveSupabaseServiceRoleKeyRow();
    case 'GUEST_SESSION_SECRET':
    case 'RECEPTION_SESSION_SECRET':
    case 'DEV_PANEL_SECRET':
      return resolveAdminFallbackRow(key);
    default:
      return resolvePlainRow(key);
  }
}

export function buildDevPanelEnvRows(snapshotEnvKeys: string[]): DevPanelEnvRow[] {
  return snapshotEnvKeys.map((key) =>
    SPECIAL_ENV_KEYS.has(key) ? resolveSpecialRow(key) : resolvePlainRow(key)
  );
}

export function isDevPanelEnvRowOk(row: DevPanelEnvRow): boolean {
  return row.effective === 'set' || row.effective === 'fallback';
}

export function resolveSupabaseAdminKeyLabel(): string {
  if (envTrim('SUPABASE_SECRET_KEY')) return 'SUPABASE_SECRET_KEY';
  if (envTrim('SUPABASE_SERVICE_ROLE_KEY')) return 'SUPABASE_SERVICE_ROLE_KEY';
  return 'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY';
}

export function isGuestSessionSecretEffective(): boolean {
  return Boolean(envTrim('GUEST_SESSION_SECRET') || envTrim('ADMIN_SECRET'));
}

export function isReceptionSessionSecretEffective(): boolean {
  return Boolean(envTrim('RECEPTION_SESSION_SECRET') || envTrim('ADMIN_SECRET'));
}

export function isDevPanelSecretEffective(): boolean {
  return Boolean(envTrim('DEV_PANEL_SECRET') || envTrim('ADMIN_SECRET'));
}

export function isSupabaseServerKeyEffective(): boolean {
  return resolveSupabaseServerKey() === 'set';
}
