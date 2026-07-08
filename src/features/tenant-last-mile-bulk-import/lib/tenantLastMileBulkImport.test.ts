import { describe, expect, it } from 'vitest';
import { parseTenantLastMileBulkJson } from './tenantLastMileBulkImportSchema';
import {
  applyTenantLastMileBulkPreview,
  buildTenantLastMileBulkPreviewState,
} from './applyTenantLastMileBulkPreview';

describe('parseTenantLastMileBulkJson', () => {
  it('accepts per-route last mile document', () => {
    const raw = JSON.stringify({
      tenantSlug: 'demo',
      routes: {
        airport: {
          mode: 'from_get_off',
          walkEn: 'From the square walk to {address}.',
        },
      },
    });
    const result = parseTenantLastMileBulkJson(raw);
    expect(result.ok).toBe(true);
  });
});

describe('applyTenantLastMileBulkPreview', () => {
  it('merges walk and tips for selected routes only', () => {
    const result = applyTenantLastMileBulkPreview({
      document: {
        tenantSlug: 'demo',
        routes: {
          airport: { mode: 'from_get_off', walkEn: 'Turn left at the kiosk to {address}.' },
          bus_central: { mode: 'walk_only_hub', walkEn: 'Follow the river to {address}.' },
        },
      },
      routeIdsToApply: ['airport'],
      hostelAddress: '12 Main St',
      currentWalkByRoute: {
        bus_central: { en: 'Keep existing bus walk' },
      },
      currentTipsByRoute: {},
    });

    expect(result.arrivalWalkToHostelByRoute.airport?.en).toContain('12 Main St');
    expect(result.arrivalWalkToHostelByRoute.bus_central?.en).toBe('Keep existing bus walk');
  });

  it('writes getOffEn to tenant override only', () => {
    const result = applyTenantLastMileBulkPreview({
      document: {
        tenantSlug: 'demo',
        routes: {
          airport: {
            mode: 'from_get_off',
            walkEn: 'From the earlier stop walk to {address}.',
            getOffEn: 'Side street before the square',
          },
        },
      },
      routeIdsToApply: ['airport'],
      hostelAddress: '12 Main St',
      currentWalkByRoute: {},
      currentTipsByRoute: {},
      currentGetOffByRoute: {},
    });

    expect(result.arrivalGetOffAtByRoute.airport).toEqual({
      en: 'Side street before the square',
    });
  });

  it('writes tenant_local_full into arrivalLocalByRoute', () => {
    const result = applyTenantLastMileBulkPreview({
      document: {
        tenantSlug: 'demo',
        routes: {
          bus_central: {
            mode: 'tenant_local_full',
            localMode: 'walk',
            walkEn: 'Exit the station and follow the alley to {address}.',
            titleEn: 'From central bus',
          },
        },
      },
      routeIdsToApply: ['bus_central'],
      hostelAddress: '12 Main St',
      currentWalkByRoute: {},
      currentTipsByRoute: {},
      currentLocalByRoute: {},
      cityRoutes: {
        bus_central: {
          category: 'bus',
          hubArrivalKind: 'tenant_local',
          locationLabel: { en: 'Bus' },
          copy: {
            publicTitle: { en: '' },
            publicSummary: { en: '' },
            publicPreview: { en: '' },
            publicText: { en: '' },
            publicGetOffAt: { en: '' },
            publicWalkToHostel: { en: '' },
            taxiCost: { en: '' },
            taxiPickupPoint: { en: '' },
          },
          transit: { durationMin: 5 },
          taxi: {
            priceKM: { min: 0, max: 0 },
            priceEUR: { min: 0, max: 0 },
            durationMin: { min: 0, max: 0 },
          },
        },
      },
    });

    expect(result.arrivalLocalByRoute.bus_central?.mode).toBe('walk');
    expect(result.arrivalLocalByRoute.bus_central?.primaryText).toEqual({
      en: 'Exit the station and follow the alley to 12 Main St.',
    });
    expect(result.arrivalLocalByRoute.bus_central?.title).toEqual({ en: 'From central bus' });
  });
});

describe('buildTenantLastMileBulkPreviewState research scope', () => {
  it('ignores hubs outside researchRouteIds', () => {
    const state = buildTenantLastMileBulkPreviewState({
      tenantSlug: 'demo',
      hostelAddress: 'Addr',
      researchRouteIds: ['airport'],
      cityRoutes: {},
      document: {
        tenantSlug: 'demo',
        routes: {
          airport: { mode: 'from_get_off', walkEn: 'Walk north.' },
          bus_central: { mode: 'walk_only_hub', walkEn: 'Walk south.' },
        },
      },
    });

    expect(state.hubs.map((hub) => hub.routeId)).toEqual(['airport']);
    expect(state.ignoredOutOfScopeRouteIds).toEqual(['bus_central']);
  });
});
