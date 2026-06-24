#!/usr/bin/env node
/**
 * Verify city_packs.content matches scripts/fixtures/* seed files (places + routes).
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

function stableStringify(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

function normalizeRouteSeed(route) {
  if (!route || typeof route !== 'object') {
    return null;
  }

  return JSON.parse(JSON.stringify(route));
}

function loadRouteSeed(packId) {
  const filePath = path.join(FIXTURES_DIR, `${packId}-routes.seed.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${filePath} must contain a JSON object`);
  }

  return raw;
}

function diffRoutes(packId, expected, actualContent) {
  const violations = [];
  const expectedRoutes = expected.routes ?? {};
  const actualRoutes = actualContent?.routes ?? {};

  if (!actualRoutes || Object.keys(actualRoutes).length === 0) {
    violations.push(`${packId}: routes missing in DB — run npm run city-pack:migrate-routes:apply`);
    return violations;
  }

  for (const routeId of Object.keys(expectedRoutes)) {
    const expectedRoute = normalizeRouteSeed(expectedRoutes[routeId]);
    const actualRoute = normalizeRouteSeed(actualRoutes[routeId]);

    if (!actualRoute) {
      violations.push(`${packId}: missing route id=${routeId}`);
      continue;
    }

    if (stableStringify(expectedRoute) !== stableStringify(actualRoute)) {
      violations.push(`${packId}: route id=${routeId} differs from seed fixture`);
    }
  }

  const expectedWarnings = stableStringify(expected.warnings ?? {});
  const actualWarnings = stableStringify(actualContent?.warnings ?? {});
  if (expectedWarnings !== actualWarnings) {
    violations.push(`${packId}: warnings differ from seed fixture`);
  }

  return violations;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('[city-pack:parity] DATABASE_URL is not set — skipping parity check.');
    process.exit(0);
  }

  const placeSeedFiles = fs
    .readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('-places.seed.json'));
  const routeSeedFiles = fs
    .readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('-routes.seed.json'));

  if (placeSeedFiles.length === 0 && routeSeedFiles.length === 0) {
    console.log('[city-pack:parity] No seed fixtures found — nothing to verify.');
    return;
  }

  const packIds = [
    ...new Set([
      ...placeSeedFiles.map((name) => name.replace('-places.seed.json', '')),
      ...routeSeedFiles.map((name) => name.replace('-routes.seed.json', '')),
    ]),
  ];

  const sql = postgres(databaseUrl, { max: 1, idle_timeout: 20, connect_timeout: 30 });

  try {
    const violations = [];

    for (const packId of packIds) {
      const expectedPlaces = loadSeed(packId);
      const expectedRoutes = loadRouteSeed(packId);

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

      if (expectedPlaces) {
        const actual = normalizeDbPlaces(content.places);
        violations.push(...diffPlaces(packId, expectedPlaces, actual));
      }

      if (expectedRoutes) {
        violations.push(...diffRoutes(packId, expectedRoutes, content));
      }
    }

    if (violations.length === 0) {
      console.log('[city-pack:parity] OK — DB content matches seed fixtures.');
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
