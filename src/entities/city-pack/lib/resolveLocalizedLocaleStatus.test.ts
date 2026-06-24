import { describe, expect, it } from 'vitest';
import { buildCityPackRoutesFromCode } from './buildCityPackRouteContentFromCode';
import { copyRouteEnToRu, resolveRouteLocaleStatus } from './resolveLocalizedLocaleStatus';

describe('resolveLocalizedLocaleStatus', () => {
  it('marks en complete for sarajevo airport seed', () => {
    const route = buildCityPackRoutesFromCode('sarajevo').airport!;
    const status = resolveRouteLocaleStatus(route);

    expect(status.en).toBe(true);
  });

  it('copies en to empty ru fields', () => {
    const route = buildCityPackRoutesFromCode('sarajevo').airport!;
    const copied = copyRouteEnToRu({
      ...route,
      copy: {
        ...route.copy,
        publicTitle: { en: 'Test title', ru: '' },
      },
    });

    expect(copied.copy.publicTitle.ru).toBe('Test title');
  });
});
