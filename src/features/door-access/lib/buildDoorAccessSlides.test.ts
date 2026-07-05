import { describe, expect, it } from 'vitest';
import { buildHostelConfig } from '@/entities/tenant/lib/buildHostelConfig';
import { resolveArrivalAccessPlan } from '@/entities/tenant/lib/resolveArrivalAccessPlan';
import type { TenantSettings } from '@/entities/tenant/model/settings';
import {
  buildDoorAccessSlides,
  DOOR_ACCESS_LANDMARK_BANNER,
} from './buildDoorAccessSlides';

function slidesFor(settings: TenantSettings, isNightMode: boolean) {
  const plan = resolveArrivalAccessPlan(settings, buildHostelConfig(settings), isNightMode);
  return buildDoorAccessSlides(plan, { isNightMode });
}

describe('buildDoorAccessSlides', () => {
  it('landmark plus two door slides in day order', () => {
    const settings: TenantSettings = {
      arrivalAccess: {
        layoutKind: 'building_then_zones',
        landmark: '/images/facade.jpg',
        accessPoints: [
          {
            id: 'building_entrance',
            kind: 'outside',
            label: 'Building entrance',
            image: '/images/entrance.jpg',
          },
          {
            id: 'floor_1',
            kind: 'zone',
            label: 'Floor 1',
            image: '/images/floor1.jpg',
          },
        ],
      },
    };

    const { slides, sectionBanner } = slidesFor(settings, false);

    expect(slides).toHaveLength(3);
    expect(slides[0]).toMatchObject({
      kind: 'landmark',
      landmark: { imageSrc: '/images/facade.jpg' },
      banner: DOOR_ACCESS_LANDMARK_BANNER,
    });
    expect(slides[1]).toMatchObject({
      kind: 'access',
      media: 'photo',
      step: { id: 'building_entrance', label: 'Building entrance' },
    });
    expect(slides[2]).toMatchObject({
      kind: 'access',
      media: 'photo',
      step: { id: 'floor_1', label: 'Floor 1' },
    });
    expect(sectionBanner?.titleKey).toBe('guide.day.title');
  });

  it('two access slides only when landmark is missing', () => {
    const settings: TenantSettings = {
      arrivalAccess: {
        accessPoints: [
          { id: 'building_entrance', label: 'Entrance', image: '/images/entrance.jpg' },
          { id: 'floor_1', label: 'Floor 1', image: '/images/floor1.jpg' },
        ],
      },
    };

    const { slides } = slidesFor(settings, false);

    expect(slides.every((slide) => slide.kind === 'access')).toBe(true);
    expect(slides).toHaveLength(2);
    expect(slides.map((slide) => slide.kind === 'access' && slide.step.id)).toEqual([
      'building_entrance',
      'floor_1',
    ]);
  });

  it('night mode with codes and no photos yields text access slides', () => {
    const settings: TenantSettings = {
      arrivalAccess: {
        accessPoints: [
          { id: 'building_entrance', label: 'Building entrance', code: 'A123#' },
          { id: 'floor_1', label: 'Floor 1', code: '1111*' },
        ],
      },
    };

    const { slides, sectionBanner } = slidesFor(settings, true);

    expect(slides).toHaveLength(2);
    expect(slides[0]).toMatchObject({
      kind: 'access',
      media: 'text',
      step: { id: 'building_entrance', showCode: true, code: 'A123#' },
    });
    expect(slides[1]).toMatchObject({
      kind: 'access',
      media: 'text',
      step: { id: 'floor_1', showCode: true, code: '1111*' },
    });
    expect(sectionBanner?.titleKey).toBe('guide.night.title');
  });
});
