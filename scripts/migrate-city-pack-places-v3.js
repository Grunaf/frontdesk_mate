#!/usr/bin/env node
/**
 * Apply city pack places v3 migration to city_packs.content (JS path, mirrors 022 SQL).
 * Usage:
 *   node scripts/migrate-city-pack-places-v3.js --dry-run
 *   node scripts/migrate-city-pack-places-v3.js --apply
 */

const { loadEnvConfig } = require('@next/env');
const postgres = require('postgres');
const {
  contentHasLegacyCityPackPlaces,
  findLegacyCityPackPlaceKeys,
  migrateCityPackContentV3,
} = require('./lib/migrateCityPackPlaceV3');

loadEnvConfig(process.cwd());

function readOptions() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || !args.includes('--apply'),
    apply: args.includes('--apply'),
  };
}

function summarizePack(row) {
  const content =
    row.content && typeof row.content === 'object' ? row.content : { places: [] };
  const places = Array.isArray(content.places) ? content.places : [];
  const legacyPlaces = places
    .map((place, index) => ({
      index,
      id: place?.id ?? `#${index}`,
      keys: place && typeof place === 'object' ? findLegacyCityPackPlaceKeys(place) : [],
    }))
    .filter((entry) => entry.keys.length > 0);

  return {
    id: row.id,
    label: row.label,
    placeCount: places.length,
    hasLegacy: contentHasLegacyCityPackPlaces(content),
    legacyPlaces,
    migratedContent: migrateCityPackContentV3(content),
  };
}

async function main() {
  const { dryRun, apply } = readOptions();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error(
      '[city-pack:migrate-v3] DATABASE_URL is not set. Add Postgres URI to .env.local.'
    );
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1, idle_timeout: 20, connect_timeout: 30 });

  try {
    const rows = await sql`select id, label, content from city_packs order by id`;
    const summaries = rows.map(summarizePack);
    const packsToMigrate = summaries.filter((summary) => summary.hasLegacy);

    if (packsToMigrate.length === 0) {
      console.log('[city-pack:migrate-v3] All city packs already use v3 place fields.');
      return;
    }

    console.log(
      `[city-pack:migrate-v3] Found ${packsToMigrate.length} pack(s) with legacy place keys:`
    );

    for (const summary of packsToMigrate) {
      console.log(`\n- ${summary.id} (${summary.label ?? 'no label'}) — ${summary.placeCount} places`);
      for (const legacyPlace of summary.legacyPlaces) {
        console.log(`    · ${legacyPlace.id}: ${legacyPlace.keys.join(', ')}`);
      }
    }

    if (dryRun) {
      console.log('\n[city-pack:migrate-v3] Dry run only. Re-run with --apply to write changes.');
      return;
    }

    await sql.begin(async (tx) => {
      for (const summary of packsToMigrate) {
        await tx`
          update city_packs
          set content = ${summary.migratedContent}, updated_at = now()
          where id = ${summary.id}
        `;
      }
    });

    console.log(`\n[city-pack:migrate-v3] Migrated ${packsToMigrate.length} pack(s).`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[city-pack:migrate-v3] Failed:', error.message ?? error);
    process.exit(1);
  });
}

module.exports = { summarizePack };
