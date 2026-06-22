#!/usr/bin/env node
/**
 * Writes CONTEXT_SNAPSHOT.md — compact project context for AI chats.
 * Run: npm run snapshot
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { SNAPSHOT_ENV_KEYS } = require('./lib/snapshotEnvKeys');

const ROOT = path.join(__dirname, '..');

function loadEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) continue;

    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

loadEnvFiles();
const OUT = path.join(ROOT, 'CONTEXT_SNAPSHOT.md');
const APP_DIR = path.join(ROOT, 'src', 'app');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const SETTINGS_TYPE = path.join(ROOT, 'src', 'entities', 'tenant', 'model', 'settings.ts');

function readSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function gitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function envPresence() {
  return SNAPSHOT_ENV_KEYS.map((key) => {
    const value = process.env[key];
    const set = Boolean(value && String(value).trim());
    return `| \`${key}\` | ${set ? 'set' : 'missing'} |`;
  });
}

function inferSite(routePath) {
  if (routePath.includes('admin')) return 'admin';
  if (routePath.includes('reception-site')) return 'reception';
  if (routePath.includes('app-site')) return 'guest-app';
  if (routePath.includes('landing-site')) return 'landing';
  if (routePath.includes('platform-site')) return 'platform';
  if (routePath.includes('dev-panel')) return 'dev';
  if (routePath.startsWith('api/')) return 'api';
  return 'root';
}

function collectRoutes(dir, prefix = '') {
  const rows = [];
  if (!fs.existsSync(dir)) return rows;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (entry.name.startsWith('_') || entry.name === 'node_modules') continue;
      rows.push(...collectRoutes(path.join(dir, entry.name), rel));
      continue;
    }

    if (entry.name === 'page.tsx' || entry.name === 'route.ts') {
      const publicPath = rel
        .replace(/\/page\.tsx$/, '')
        .replace(/\/route\.ts$/, '')
        .replace(/\[\.\.\.[^\]]+\]/g, '*')
        .replace(/\[[^\]]+\]/g, ':param')
        .replace(/^\(protected\)\/?/, '')
        .replace(/^\([^)]+\)\/?/, '');

      const site = inferSite(rel);
      const kind = entry.name === 'route.ts' ? 'API' : 'page';
      rows.push(`| \`/${publicPath || ''}\` | ${site} | ${kind} |`);
    }
  }

  return rows.sort((a, b) => a.localeCompare(b));
}

function parseTablesFromMigrations() {
  const tables = new Map();
  if (!fs.existsSync(MIGRATIONS_DIR)) return tables;

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = readSafe(path.join(MIGRATIONS_DIR, file));
    const createRe = /create table(?: if not exists)?\s+([a-z_][a-z0-9_.]*)/gi;
    let match;
    while ((match = createRe.exec(sql)) !== null) {
      const name = match[1].replace(/^public\./, '');
      if (!tables.has(name)) {
        tables.set(name, file);
      }
    }
  }

  return tables;
}

function parseTenantSettingsKeys() {
  const source = readSafe(SETTINGS_TYPE);
  const keys = [];
  const ifaceMatch = source.match(/export interface TenantSettings\s*\{([\s\S]*?)\n\}/);
  if (!ifaceMatch) return keys;

  const body = ifaceMatch[1];
  for (const line of body.split('\n')) {
    const m = line.match(/^\s{2}(\w+)\??\s*:/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

function recentMigrations(limit = 5) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .slice(-limit)
    .map((file) => {
      const firstLine =
        readSafe(path.join(MIGRATIONS_DIR, file))
          .split('\n')
          .find((l) => l.trim().startsWith('--'))?.replace(/^--\s*/, '') || file;
      return `- \`${file}\` — ${firstLine}`;
    });
}

function listSmokeSpecs() {
  const smokeDir = path.join(ROOT, 'e2e', 'smoke');
  if (!fs.existsSync(smokeDir)) return [];
  return fs
    .readdirSync(smokeDir)
    .filter((f) => f.endsWith('.spec.ts'))
    .sort()
    .map((f) => `- \`e2e/smoke/${f}\``);
}

function formatProductMap() {
  const mapPath = path.join(ROOT, 'src', 'shared', 'config', 'product-map.json');
  if (!fs.existsSync(mapPath)) return '_No product-map.json_';

  const entries = JSON.parse(readSafe(mapPath));
  if (!Array.isArray(entries) || entries.length === 0) return '_Empty product map_';

  const rows = entries.map(
    (e) =>
      `| ${e.useCase} | ${e.area} | ${e.status} | ${e.smokeSpec ? `\`${e.smokeSpec}\`` : '—'} |`
  );

  return `| Use case | Area | Status | Smoke |
|----------|------|--------|-------|
${rows.join('\n')}

Edit: \`src/shared/config/product-map.json\` · UI: \`/dev-panel\``;
}

function packageScripts() {
  const pkg = JSON.parse(readSafe(path.join(ROOT, 'package.json')));
  const keys = [
    'dev',
    'build',
    'test',
    'smoke',
    'db:migrate',
    'validate-i18n',
    'snapshot',
  ];
  return keys
    .filter((k) => pkg.scripts?.[k])
    .map((k) => `- \`npm run ${k}\` — \`${pkg.scripts[k]}\``);
}

function buildMarkdown() {
  const pkg = JSON.parse(readSafe(path.join(ROOT, 'package.json')));
  const routes = collectRoutes(APP_DIR);
  const tables = parseTablesFromMigrations();
  const settingsKeys = parseTenantSettingsKeys();
  const now = new Date().toISOString().slice(0, 10);

  const tableRows = [...tables.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, migration]) => `| \`${name}\` | introduced in \`${migration}\` |`);

  return `# CONTEXT_SNAPSHOT

> Auto-generated ${now}. Regenerate: \`npm run snapshot\`. Do not commit (gitignored).

## Meta

- **Project:** ${pkg.name} v${pkg.version}
- **Branch:** \`${gitBranch()}\`
- **Stack:** Next.js App Router, Supabase, next-intl (en/ru), Vitest, Playwright smoke

## Sites (host routing)

| Site | Internal folder | Notes |
|------|-----------------|-------|
| Landing | \`landing-site/[locale]\` | \`{slug}.domain\` or flat dev |
| Guest app | \`app-site/[locale]\` | \`{slug}.app.domain\`, check-in, welcome, concierge |
| Platform recovery | \`platform-site/[locale]\` | prod bare domain / app without tenant |
| Reception | \`reception-site\` | desk PIN flow |
| Admin | \`admin/*\` | tenant + city pack authoring (\`ADMIN_SECRET\`) |
| Dev panel | \`dev-panel/*\` | dev-only diagnostics (\`DEV_PANEL_SECRET\` or \`ADMIN_SECRET\`) |

Proxy: \`src/proxy.ts\` — tenant slug from host header, i18n \`en|ru\`.

## Routes

| Path | Site | Kind |
|------|------|------|
${routes.join('\n')}

## DB tables (from migrations)

| Table | Source |
|-------|--------|
${tableRows.join('\n') || '| — | — |'}

## TenantSettings keys (\`tenants.settings\` JSON)

${settingsKeys.map((k) => `- \`${k}\``).join('\n')}

Authoring UI: \`/admin/tenants/[slug]\` (not code files).

## Guest app modules (readiness)

| Module ID | Label | Resolver |
|-----------|-------|----------|
| \`roomMap\` | Room map | \`resolveGuestAppModules\` |
| \`houseRules\` | House rules | \`resolveGuestAppModules\` |
| \`localGuide\` | Local guide | \`resolveGuestAppModules\` + city pack gate |

## Product map

${formatProductMap()}

## Env vars (presence only)

| Variable | Status |
|----------|--------|
${envPresence().join('\n')}

## npm scripts

${packageScripts().join('\n')}

## Smoke specs

${listSmokeSpecs().join('\n')}

Manual pass: \`SMOKE.md\`.

## Recent migrations

${recentMigrations().join('\n')}
`;
}

function main() {
  const md = buildMarkdown();
  fs.writeFileSync(OUT, md, 'utf8');
  const lines = md.split('\n').length;
  console.log(`[snapshot] Wrote ${OUT} (${lines} lines)`);
}

main();
