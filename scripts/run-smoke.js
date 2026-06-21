#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const envLocalPath = path.join(__dirname, '..', 'e2e', 'env.local');

function hasCiE2eEnv() {
  return (
    Boolean(process.env.E2E_ADMIN_PASSWORD?.trim()) &&
    Boolean(process.env.E2E_GUEST_PIN?.trim()) &&
    Boolean(process.env.E2E_TENANT_SLUG?.trim())
  );
}

if (!fs.existsSync(envLocalPath) && !hasCiE2eEnv()) {
  console.error(
    '[smoke] Missing e2e/env.local — copy e2e/env.example and fill E2E_ADMIN_PASSWORD + E2E_GUEST_PIN + E2E_TENANT_SLUG.'
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
