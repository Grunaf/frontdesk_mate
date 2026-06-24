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
const CITY_PACK_TYPE = path.join(ROOT, 'src', 'entities', 'city-pack', 'model', 'types.ts');
const ADMIN_SECTIONS_FILE = path.join(
  ROOT,
  'src',
  'app',
  'admin',
  '(protected)',
  'tenants',
  'lib',
  'adminSections.ts'
);

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

function parseInterfaceKeys(filePath, interfaceName) {
  const source = readSafe(filePath);
  const keys = [];
  const ifaceMatch = source.match(
    new RegExp(`export interface ${interfaceName}\\s*\\{([\\s\\S]*?)\\n\\}`)
  );
  if (!ifaceMatch) return keys;

  for (const line of ifaceMatch[1].split('\n')) {
    const m = line.match(/^\s{2}(\w+)\??\s*:/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

function parseTenantSettingsKeys() {
  return parseInterfaceKeys(SETTINGS_TYPE, 'TenantSettings');
}

function parseCityPackContentKeys() {
  return parseInterfaceKeys(CITY_PACK_TYPE, 'CityPackContent');
}

function parseAdminSections() {
  const source = readSafe(ADMIN_SECTIONS_FILE);
  const rows = [];
  const blockRe = /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)',\s*description:\s*'([^']+)',?\s*\}/g;
  let match;
  while ((match = blockRe.exec(source)) !== null) {
    rows.push(`| \`${match[1]}\` | ${match[2]} | ${match[3]} |`);
  }
  return rows;
}

function gitDirtySummary() {
  try {
    const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' }).trim();
    if (!status) return '_Working tree clean._';
    const lines = status.split('\n');
    const modified = lines.filter((l) => l.startsWith(' M') || l.startsWith('M ')).length;
    const untracked = lines.filter((l) => l.startsWith('??')).length;
    return `${modified} modified, ${untracked} untracked — run \`git status\` before commit.`;
  } catch {
    return '_Git status unavailable._';
  }
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
    'city-pack:migrate-routes',
    'city-pack:migrate-routes:apply',
    'city-pack:export-routes',
    'city-pack:parity',
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
  const cityPackKeys = parseCityPackContentKeys();
  const adminSections = parseAdminSections();
  const now = new Date().toISOString().slice(0, 10);

  const tableRows = [...tables.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, migration]) => `| \`${name}\` | introduced in \`${migration}\` |`);

  return `# CONTEXT_SNAPSHOT

> Auto-generated ${now}. Regenerate: \`npm run snapshot\`. Do not commit (gitignored).

## Meta

- **Project:** ${pkg.name} v${pkg.version}
- **Branch:** \`${gitBranch()}\`
- **Working tree:** ${gitDirtySummary()}
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

## CityPackContent keys (\`city_packs.content\` JSON)

${cityPackKeys.map((k) => `- \`${k}\``).join('\n')}

Authoring UI: \`/admin/city-packs/[id]\` wizard — Identity → Places → Routes & guide → Preview.

## Arrival transport (data layers)

| Layer | Storage | Admin UI | Guest merge |
|-------|---------|----------|-------------|
| City hubs & copy | \`city_packs.content.routes\` | City pack → Routes step | \`resolveCityPackForGuest\` |
| Hostel last mile | \`arrivalWalkToHostel*\`, \`contacts.address\` | Tenant → Contacts (transport block) | \`resolveWalkToHostel\` |
| Door access | \`arrivalAccess\` | Tenant → Arrival & doors | arrival guide after route |

TZ: \`docs/tz/transport-editor-v1.md\` · Key files: \`resolveCityPackForGuest.ts\`, \`resolveRouteCopy.ts\`, \`ArrivalTransportFields.tsx\`, \`CityPackRoutesStep.tsx\`.

## Admin tenant sections

| ID | Label | Description |
|----|-------|-------------|
${adminSections.join('\n')}

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
