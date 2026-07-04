import { describe, expect, it } from 'vitest';
import { createBlankCityPackRouteContent } from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import { isGuidedPreviewGateReady } from './guidedPreviewGate';
import type { GuidedRouteFillPreview } from '../model/types';

describe('guidedPreviewGate', () => {
  it('is ready when preview fills gate EN fields', () => {
    const route = createBlankCityPackRouteContent('airport');
    const preview: GuidedRouteFillPreview = {
      copy: {
        publicTitle: 'Airport bus',
        publicSummary: 'Take the bus',
        publicText: 'Board at stop A',
        publicGetOffAt: 'Main gate',
      },
      openQuestions: [],
    };

    expect(isGuidedPreviewGateReady('kotor', 'airport', route, preview).ready).toBe(true);
  });

  it('is not ready when get off missing on transit', () => {
    const route = createBlankCityPackRouteContent('airport');
    const preview: GuidedRouteFillPreview = {
      routeMode: 'transit',
      copy: {
        publicTitle: 'Airport bus',
        publicSummary: 'Take the bus',
        publicText: 'Board at stop A',
      },
      openQuestions: [],
    };

    expect(isGuidedPreviewGateReady('kotor', 'airport', route, preview).ready).toBe(false);
  });
});
