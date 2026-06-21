#!/usr/bin/env node
/**
 * Fail if any city_packs.content.places still contain legacy v2 keys.
 */

const { loadEnvConfig } = require('@next/env');
const postgres = require('postgres');
const {
  contentHasLegacyCityPackPlaces,
  findLegacyCityPackPlaceKeys,
  LEGACY_CITY_PACK_PLACE_KEYS,
} = require('./lib/migrateCityPackPlaceV3');

loadEnvConfig(process.cwd());

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn(
      '[city-pack:validate-v3] DATABASE_URL is not set — skipping DB validation.'
    );
    process.exit(0);
  }

  const sql = postgres(databaseUrl, { max: 1, idle_timeout: 20, connect_timeout: 30 });

  try {
    const rows = await sql`select id, label, content from city_packs order by id`;
    const violations = [];

    for (const row of rows) {
      const content =
        row.content && typeof row.content === 'object' ? row.content : { places: [] };
      if (!contentHasLegacyCityPackPlaces(content)) {
        continue;
      }

      const places = Array.isArray(content.places) ? content.places : [];
      for (const place of places) {
        if (!place || typeof place !== 'object') {
          continue;
        }

        const legacyKeys = findLegacyCityPackPlaceKeys(place);
        if (legacyKeys.length === 0) {
          continue;
        }

        violations.push({
          packId: row.id,
          placeId: place.id ?? '(missing id)',
          legacyKeys,
        });
      }
    }

    if (violations.length === 0) {
      console.log('[city-pack:validate-v3] OK — no legacy place keys in city_packs.');
      return;
    }

    console.error('[city-pack:validate-v3] Legacy keys found:');
    for (const violation of violations) {
      console.error(
        `  - pack=${violation.packId} place=${violation.placeId} keys=${violation.legacyKeys.join(', ')}`
      );
    }
    console.error(
      `[city-pack:validate-v3] Blocked keys: ${LEGACY_CITY_PACK_PLACE_KEYS.join(', ')}`
    );
    console.error('[city-pack:validate-v3] Run: npm run city-pack:migrate-v3:apply');
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[city-pack:validate-v3] Failed:', error.message ?? error);
    process.exit(1);
  });
}
