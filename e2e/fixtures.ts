import fs from 'node:fs';
import path from 'node:path';
import { readSmokeSession } from './lib/smokeRuntime';

export type E2eUrlMode = 'flat' | 'subdomain';

export interface E2eConfig {
  baseDomain: string;
  urlMode: E2eUrlMode;
  tenantSlug: string;
  locale: string;
  cityPackId: string;
  adminPassword: string;
  guestPin: string;
  guestMagicLink?: string;
  receptionDeskPin?: string;
  navTimeoutMs: number;
  /** When true, runs optional tourism deep-link smoke (tenant must have tourism registration enabled). */
  tourismSmoke: boolean;
}

interface LoadE2eConfigOptions {
  allowMissingGuestPin?: boolean;
}

const ENV_LOCAL_PATH = path.join(__dirname, 'env.local');

function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadEnvLocal(): Record<string, string> {
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    return {};
  }

  return parseEnvFile(fs.readFileSync(ENV_LOCAL_PATH, 'utf8'));
}

function readEnv(key: string, fileEnv: Record<string, string>): string | undefined {
  return process.env[key]?.trim() || fileEnv[key]?.trim() || undefined;
}

function requireEnv(key: string, fileEnv: Record<string, string>): string {
  const value = readEnv(key, fileEnv);
  if (!value) {
    throw new Error(
      `Missing ${key}. Copy e2e/env.example → e2e/env.local and fill in test credentials.`
    );
  }

  return value;
}

function optionalEnv(key: string, fileEnv: Record<string, string>): string | undefined {
  const value = readEnv(key, fileEnv);
  return value || undefined;
}

function readTourismSmokeFlag(fileEnv: Record<string, string>): boolean {
  const raw = readEnv('E2E_TOURISM_SMOKE', fileEnv)?.toLowerCase();
  return raw === '1' || raw === 'true';
}

export function isTourismSmokeEnabled(fileEnv: Record<string, string> = loadEnvLocal()): boolean {
  return readTourismSmokeFlag(fileEnv);
}

function readUrlMode(fileEnv: Record<string, string>): E2eUrlMode {
  const raw = (readEnv('E2E_URL_MODE', fileEnv) ?? 'flat').toLowerCase();
  return raw === 'subdomain' ? 'subdomain' : 'flat';
}

export function isSupabaseConfiguredForProvision(): boolean {
  const secret =
    process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const pinSecret =
    process.env.GUEST_SESSION_SECRET?.trim() ||
    process.env.RECEPTION_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim();
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && secret && pinSecret);
}

export function shouldProvisionGuestStay(fileEnv: Record<string, string> = loadEnvLocal()): boolean {
  if (readEnv('E2E_PROVISION_GUEST_STAY', fileEnv)?.toLowerCase() === 'false') {
    return false;
  }
  return isSupabaseConfiguredForProvision();
}

function resolveGuestPin(
  fileEnv: Record<string, string>,
  allowMissingGuestPin: boolean
): string {
  const runtimePin = readSmokeSession()?.guestPin;
  if (runtimePin) {
    return runtimePin;
  }

  const envPin = optionalEnv('E2E_GUEST_PIN', fileEnv);
  if (envPin) {
    return envPin;
  }

  if (allowMissingGuestPin && shouldProvisionGuestStay(fileEnv)) {
    return '';
  }

  throw new Error(
    'Missing E2E_GUEST_PIN. Enable auto-provision (Supabase keys + ADMIN_SECRET in .env.local) or set E2E_GUEST_PIN in e2e/env.local.'
  );
}

/** Loaded once per test run from e2e/env.local + process.env. */
export function loadE2eConfig(options: LoadE2eConfigOptions = {}): E2eConfig {
  const fileEnv = loadEnvLocal();
  const inCi = process.env.CI === 'true';
  const guestPin = resolveGuestPin(fileEnv, Boolean(options.allowMissingGuestPin));

  return {
    baseDomain: readEnv('E2E_BASE_DOMAIN', fileEnv) ?? 'localhost:3000',
    urlMode: readUrlMode(fileEnv),
    tenantSlug: requireEnv('E2E_TENANT_SLUG', fileEnv),
    locale: readEnv('E2E_LOCALE', fileEnv) ?? 'en',
    cityPackId: inCi
      ? requireEnv('E2E_CITY_PACK_ID', fileEnv)
      : (readEnv('E2E_CITY_PACK_ID', fileEnv) ?? 'sarajevo'),
    adminPassword: requireEnv('E2E_ADMIN_PASSWORD', fileEnv),
    guestPin,
    guestMagicLink: optionalEnv('E2E_GUEST_MAGIC_LINK', fileEnv),
    receptionDeskPin: optionalEnv('E2E_RECEPTION_DESK_PIN', fileEnv),
    navTimeoutMs: Number(readEnv('E2E_NAV_TIMEOUT', fileEnv) ?? '15000'),
    tourismSmoke: readTourismSmokeFlag(fileEnv),
  };
}

function protocolForDomain(baseDomain: string): string {
  const host = baseDomain.split(':')[0]?.toLowerCase() ?? '';
  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1') {
    return 'http://';
  }

  return 'https://';
}

export function e2eAdminUrl(config: E2eConfig, path = '/admin/login'): string {
  const protocol = protocolForDomain(config.baseDomain);
  return `${protocol}${config.baseDomain}${path}`;
}

function guestAppHost(config: E2eConfig): string {
  if (config.urlMode === 'subdomain') {
    return `${config.tenantSlug}.app.${config.baseDomain}`;
  }

  // Dev flat mode: bare localhost serves landing; guest app lives on app.* host.
  return `app.${config.baseDomain}`;
}

export function e2eGuestAppUrl(config: E2eConfig, path = '/welcome'): string {
  const protocol = protocolForDomain(config.baseDomain);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const localePath = `/${config.locale}${normalizedPath === '/' ? '' : normalizedPath}`;

  return `${protocol}${guestAppHost(config)}${localePath}`;
}

export function e2eGuestCheckInUrl(config: E2eConfig): string {
  return e2eGuestAppUrl(config, '/check-in');
}

export function e2eLandingUrl(config: E2eConfig, path = '/'): string {
  const protocol = protocolForDomain(config.baseDomain);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const localePath = `/${config.locale}${normalizedPath === '/' ? '' : normalizedPath}`;

  if (config.urlMode === 'subdomain') {
    return `${protocol}${config.tenantSlug}.${config.baseDomain}${localePath}`;
  }

  return `${protocol}${config.baseDomain}${localePath}`;
}

export function e2eReceptionUrl(config: E2eConfig, path = '/'): string {
  const protocol = protocolForDomain(config.baseDomain);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (config.urlMode === 'subdomain') {
    return `${protocol}${config.tenantSlug}.reception.${config.baseDomain}${normalizedPath === '/' ? '' : normalizedPath}`;
  }

  return `${protocol}${config.baseDomain}/reception${normalizedPath === '/' ? '' : normalizedPath}`;
}
