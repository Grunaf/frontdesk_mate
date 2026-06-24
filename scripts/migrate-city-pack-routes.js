#!/usr/bin/env node
/**
 * Seed city_packs.content.routes + warnings from scripts/fixtures/*-routes.seed.json
 * Usage:
 *   node scripts/migrate-city-pack-routes.js --dry-run
 *   node scripts/migrate-city-pack-routes.js --apply
 */

const fs = require('node:fs');
const path = require('node:path');
const { loadEnvConfig } = require('@next/env');
const postgres = require('postgres');

loadEnvConfig(process.cwd());

const PACK_IDS = ['sarajevo', 'kotor'];
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function readOptions() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || !args.includes('--apply'),
    apply: args.includes('--apply'),
  };
}

function loadRouteSeed(packId) {
  const filePath = path.join(FIXTURES_DIR, `${packId}-routes.seed.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing fixture: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function mergeRouteContent(existingContent, seed) {
  const content =
    existingContent && typeof existingContent === 'object' ? { ...existingContent } : {};

  if (content.routes && Object.keys(content.routes).length > 0) {
    return { content, skipped: true };
  }

  return {
    content: {
      ...content,
      routes: seed.routes,
      warnings: seed.warnings ?? content.warnings,
      preTripTips: seed.preTripTips ?? content.preTripTips,
    },
    skipped: false,
  };
}

async function main() {
  const { dryRun, apply } = readOptions();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('[city-pack:routes] DATABASE_URL is not set. Add Postgres URI to .env.local.');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1, idle_timeout: 20, connect_timeout: 30 });

  try {
    const rows = await sql`select id, content from city_packs where id = any(${PACK_IDS})`;
    const updates = [];

    for (const row of rows) {
      const seed = loadRouteSeed(row.id);
      const { content, skipped } = mergeRouteContent(row.content, seed);

      updates.push({
        id: row.id,
        skipped,
        routeCount: Object.keys(seed.routes ?? {}).length,
        content,
      });
    }

    for (const update of updates) {
      if (update.skipped) {
        console.log(`[city-pack:routes] ${update.id}: routes already present — skipped`);
        continue;
      }

      console.log(
        `[city-pack:routes] ${update.id}: will seed ${update.routeCount} routes + warnings`
      );

      if (apply) {
        await sql`
          update city_packs
          set content = ${sql.json(update.content)}, updated_at = now()
          where id = ${update.id}
        `;
      }
    }

    if (dryRun && !apply) {
      console.log('[city-pack:routes] Dry run only. Re-run with --apply to persist.');
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error('[city-pack:routes] Failed:', error);
  process.exit(1);
});
