import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'vitest';
import { buildCityPackRouteSeedContent } from './buildCityPackRouteContentFromCode';

const FIXTURES_DIR = join(process.cwd(), 'scripts/fixtures');

describe('exportRouteSeedFixtures', () => {
  it('exports route seed fixtures when CITY_PACK_EXPORT_ROUTES=1', () => {
    if (process.env.CITY_PACK_EXPORT_ROUTES !== '1') {
      return;
    }

    mkdirSync(FIXTURES_DIR, { recursive: true });

    for (const packId of ['sarajevo', 'kotor'] as const) {
      const seed = buildCityPackRouteSeedContent(packId);
      writeFileSync(
        join(FIXTURES_DIR, `${packId}-routes.seed.json`),
        `${JSON.stringify(seed, null, 2)}\n`
      );
    }
  });
});
