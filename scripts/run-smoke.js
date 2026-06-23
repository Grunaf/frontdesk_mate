#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const envLocalPath = path.join(__dirname, '..', 'e2e', 'env.local');

function readEnvLocalValue(key) {
  if (!fs.existsSync(envLocalPath)) {
    return undefined;
  }

  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() !== key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }

  return undefined;
}

function provisionEnabled() {
  const flag = process.env.E2E_PROVISION_GUEST_STAY ?? readEnvLocalValue('E2E_PROVISION_GUEST_STAY');
  if (flag?.toLowerCase() === 'false') {
    return false;
  }

  const secret =
    process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const pinSecret =
    process.env.GUEST_SESSION_SECRET?.trim() ||
    process.env.RECEPTION_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim();

  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && secret && pinSecret);
}

function hasCiE2eEnv() {
  const hasGuestPin =
    Boolean(process.env.E2E_GUEST_PIN?.trim()) || provisionEnabled();

  return (
    Boolean(process.env.E2E_ADMIN_PASSWORD?.trim()) &&
    Boolean(process.env.E2E_TENANT_SLUG?.trim()) &&
    Boolean(process.env.E2E_CITY_PACK_ID?.trim()) &&
    hasGuestPin
  );
}

if (!fs.existsSync(envLocalPath) && !hasCiE2eEnv()) {
  console.error(
    '[smoke] Missing e2e/env.local — copy e2e/env.example and fill E2E_ADMIN_PASSWORD + E2E_TENANT_SLUG + E2E_CITY_PACK_ID (E2E_GUEST_PIN optional when auto-provision is enabled).'
  );
  console.error('[smoke] In CI, set repository secrets and ENABLE_SMOKE_CI=true (see SMOKE.md).');
  process.exit(1);
}

const playwrightArgs = ['playwright', 'test', ...process.argv.slice(2)];
const result = spawnSync('npx', playwrightArgs, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
