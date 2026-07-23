import { describe, expect, it } from 'vitest';
import { buildHostelConfig } from '@/entities/tenant/lib/buildHostelConfig';
import { resolveArrivalAccessPlan } from '@/entities/tenant/lib/resolveArrivalAccessPlan';
import type { TenantSettings } from '@/entities/tenant/model/settings';
import {
  buildDoorAccessSlides,
  DOOR_ACCESS_LANDMARK_BANNER,
} from './buildDoorAccessSlides';

function slidesFor(
  settings: TenantSettings,
  isNightMode: boolean,
  checkInTime?: string
) {
  const plan = resolveArrivalAccessPlan(settings, buildHostelConfig(settings), isNightMode);
  return buildDoorAccessSlides(plan, { isNightMode, checkInTime });
}

describe('buildDoorAccessSlides', () => {
  it('landmark plus two door slides in day order with walk-in section only on first access sheet', () => {
    const settings: TenantSettings = {
      arrivalAccess: {
        layoutKind: 'direct_to_floor',
        dayMode: 'walk_in',
        landmark: '/images/facade.jpg',
        accessPoints: [
          {
            id: 'hostel_door',
            kind: 'zone',
            label: 'Hostel door',
            image: '/images/door.jpg',
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
      sheet: {
        sheetContext: 'landmark',
        sheetTitle: { key: 'sections.find.title' },
        sheetBody: { key: 'sections.find.banner' },
      },
    });
    expect(slides[1]).toMatchObject({
      kind: 'access',
      media: 'photo',
      step: { id: 'hostel_door', label: 'Hostel door' },
      sheet: {
        sheetContext: 'firstAccess',
        sheetTitle: { key: 'guide.day.standalone.walkIn.title' },
        sheetBody: { key: 'guide.day.standalone.walkIn.banner' },
      },
    });
    expect(slides[2]).toMatchObject({
      kind: 'access',
      media: 'photo',
      step: { id: 'floor_1', label: 'Floor 1' },
      sheet: {
        sheetContext: 'access',
        sheetTitle: { literal: 'Floor 1' },
        sheetBody: null,
      },
    });
    expect(sectionBanner?.titleKey).toBe('guide.day.standalone.walkIn.title');
    expect(slides[0].sheet.sheetContext).not.toBe('firstAccess');
  });

  it('two access slides only when landmark is missing; first slide carries section banner', () => {
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
    expect(slides[0]).toMatchObject({
      step: { id: 'building_entrance' },
      sheet: {
        sheetContext: 'firstAccess',
        sheetTitle: { key: 'guide.day.title' },
        sheetBody: { key: 'guide.day.banner' },
      },
    });
    expect(slides[1]).toMatchObject({
      step: { id: 'floor_1' },
      sheet: {
        sheetContext: 'access',
        sheetTitle: { literal: 'Floor 1' },
        sheetBody: null,
      },
    });
  });

  it('night mode with codes adds time param on first access sheet title', () => {
    const settings: TenantSettings = {
      arrivalAccess: {
        accessPoints: [
          { id: 'building_entrance', label: 'Building entrance', code: 'A123#' },
          { id: 'floor_1', label: 'Floor 1', code: '1111*' },
        ],
      },
    };

    const { slides, sectionBanner } = slidesFor(settings, true, '22:00');

    expect(slides).toHaveLength(2);
    expect(slides[0]).toMatchObject({
      kind: 'access',
      media: 'text',
      step: { id: 'building_entrance', showCode: true, code: 'A123#' },
      sheet: {
        sheetContext: 'firstAccess',
        sheetTitle: { key: 'guide.night.title', params: { time: '22:00' } },
        sheetBody: { key: 'guide.night.banner' },
      },
    });
    expect(slides[1]).toMatchObject({
      kind: 'access',
      media: 'text',
      step: { id: 'floor_1', showCode: true, code: '1111*' },
      sheet: {
        sheetContext: 'access',
        sheetTitle: { literal: 'Floor 1' },
        sheetBody: null,
      },
    });
    expect(sectionBanner?.titleKey).toBe('guide.night.title');
  });

  it('access sheet body uses guideNote as literal', () => {
    const settings: TenantSettings = {
      arrivalAccess: {
        accessPoints: [
          { id: 'building_entrance', label: 'Entrance', image: '/images/entrance.jpg' },
          {
            id: 'floor_1',
            label: 'Floor 1',
            image: '/images/floor1.jpg',
            guideNote: 'Stairs on the left, basement door.',
          },
        ],
      },
    };

    const { slides } = slidesFor(settings, false);

    expect(slides[1]).toMatchObject({
      step: { id: 'floor_1' },
      sheet: {
        sheetContext: 'access',
        sheetBody: { literal: 'Stairs on the left, basement door.' },
      },
    });
  });
});
