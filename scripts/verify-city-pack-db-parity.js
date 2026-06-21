#!/usr/bin/env node
/**
 * Verify city_packs.content.places match scripts/fixtures/*-places.seed.json for known packs.
 */

const fs = require('node:fs');
const path = require('node:path');
const { loadEnvConfig } = require('@next/env');
const postgres = require('postgres');

loadEnvConfig(process.cwd());

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function normalizePlace(place) {
  return {
    id: String(place.id ?? '').trim(),
    category: String(place.category ?? '').trim(),
    name: String(place.name ?? '').trim(),
    googleMapsUrl: String(place.googleMapsUrl ?? '').trim(),
    isTopPick: place.isTopPick === true,
    needNow: place.needNow === true,
  };
}

function loadSeed(packId) {
  const filePath = path.join(FIXTURES_DIR, `${packId}-places.seed.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error(`${filePath} must contain a JSON array`);
  }

  return raw.map(normalizePlace).sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeDbPlaces(places) {
  if (!Array.isArray(places)) {
    return [];
  }

  return places
    .filter((place) => place && typeof place === 'object')
    .map(normalizePlace)
    .filter((place) => place.id && place.name && place.category)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function diffPlaces(packId, expected, actual) {
  const violations = [];

  const expectedById = new Map(expected.map((place) => [place.id, place]));
  const actualById = new Map(actual.map((place) => [place.id, place]));

  for (const [id, place] of expectedById) {
    const dbPlace = actualById.get(id);
    if (!dbPlace) {
      violations.push(`${packId}: missing place id=${id}`);
      continue;
    }

    for (const key of ['category', 'name', 'googleMapsUrl', 'isTopPick', 'needNow']) {
      if (place[key] !== dbPlace[key]) {
        violations.push(
          `${packId}: place id=${id} field ${key} expected ${JSON.stringify(place[key])} got ${JSON.stringify(dbPlace[key])}`
        );
      }
    }
  }

  for (const id of actualById.keys()) {
    if (!expectedById.has(id)) {
      violations.push(`${packId}: unexpected place id=${id}`);
    }
  }

  return violations;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('[city-pack:parity] DATABASE_URL is not set — skipping parity check.');
    process.exit(0);
  }

  const seedFiles = fs
    .readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('-places.seed.json'));

  if (seedFiles.length === 0) {
    console.log('[city-pack:parity] No seed fixtures found — nothing to verify.');
    return;
  }

  const sql = postgres(databaseUrl, { max: 1, idle_timeout: 20, connect_timeout: 30 });

  try {
    const violations = [];

    for (const fileName of seedFiles) {
      const packId = fileName.replace('-places.seed.json', '');
      const expected = loadSeed(packId);
      if (!expected) {
        continue;
      }

      const rows = await sql`
        select id, content
        from city_packs
        where id = ${packId}
        limit 1
      `;

      if (rows.length === 0) {
        violations.push(`${packId}: pack row missing in city_packs`);
        continue;
      }

      const content =
        rows[0].content && typeof rows[0].content === 'object' ? rows[0].content : {};
      const actual = normalizeDbPlaces(content.places);
      violations.push(...diffPlaces(packId, expected, actual));
    }

    if (violations.length === 0) {
      console.log('[city-pack:parity] OK — DB places match seed fixtures.');
      return;
    }

    console.error('[city-pack:parity] Drift detected:');
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[city-pack:parity] Failed:', error.message ?? error);
    process.exit(1);
  });
}
