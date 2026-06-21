import type { HostelConfig } from '../model/hostel-config';
import type { ArrivalLayoutKind } from '../model/accessPoints';
import type { TenantSettings } from '../model/settings';
import {
  filterAccessPointsForGuest,
  getAccessPointCodeLabelKey,
  getAccessPointTitleKey,
  normalizeAccessPoints,
  resolveArrivalLandmark,
  resolveGuestFloor,
  resolveLayoutKind,
} from './normalizeAccessPoints';

export type ArrivalDayMode = 'doorbell' | 'walk_in' | 'reception';

export interface ArrivalAccessStep {
  id: string;
  titleKey: string;
  codeLabelKey: string;
  label: string;
  guideKey?: string;
  code?: string;
  imageSrc?: string;
  imageAlt: string;
  showCode: boolean;
  missingCode: boolean;
}

export interface ArrivalLandmark {
  imageSrc: string;
  imageAlt: string;
}

export interface ArrivalBannerKeys {
  titleKey: string;
  bannerKey: string;
  hasIcon: boolean;
}

export interface ArrivalAccessPlan {
  layoutKind: ArrivalLayoutKind;
  landmark: ArrivalLandmark | null;
  guestFloor: string | null;
  dayAccess: {
    mode: ArrivalDayMode;
    banner: ArrivalBannerKeys;
    steps: ArrivalAccessStep[];
  } | null;
  nightAccess: {
    banner: ArrivalBannerKeys;
    steps: ArrivalAccessStep[];
    hasAnyCode: boolean;
  } | null;
  hasAnyDoorCode: boolean;
  steps: ArrivalAccessStep[];
}

function resolveDayMode(settings: TenantSettings, layoutKind: ArrivalLayoutKind): ArrivalDayMode {
  const configured = settings.arrivalAccess?.dayMode;
  if (configured) return configured;

  if (layoutKind === 'direct_to_floor') return 'walk_in';
  return 'doorbell';
}

function resolveDayBanner(layoutKind: ArrivalLayoutKind, dayMode: ArrivalDayMode): ArrivalBannerKeys {
  if (dayMode === 'walk_in') {
    return {
      titleKey: 'guide.day.standalone.walkIn.title',
      bannerKey: 'guide.day.standalone.walkIn.banner',
      hasIcon: false,
    };
  }

  if (dayMode === 'reception') {
    return {
      titleKey: 'guide.day.reception.title',
      bannerKey: 'guide.day.reception.banner',
      hasIcon: false,
    };
  }

  if (layoutKind === 'direct_to_floor') {
    return {
      titleKey: 'guide.day.single.title',
      bannerKey: 'guide.day.single.banner',
      hasIcon: true,
    };
  }

  return {
    titleKey: 'guide.day.title',
    bannerKey: 'guide.day.banner',
    hasIcon: true,
  };
}

function resolveNightBanner(layoutKind: ArrivalLayoutKind): ArrivalBannerKeys {
  if (layoutKind === 'direct_to_floor') {
    return {
      titleKey: 'guide.night.hostelOnly.title',
      bannerKey: 'guide.night.hostelOnly.banner',
      hasIcon: false,
    };
  }

  return {
    titleKey: 'guide.night.title',
    bannerKey: 'guide.night.banner',
    hasIcon: false,
  };
}

function buildStep(
  point: ReturnType<typeof normalizeAccessPoints>[number],
  options: {
    isNightMode: boolean;
    landmarkImage?: string;
    includeImages: boolean;
  }
): ArrivalAccessStep {
  const imageSrc = point.image?.trim() || undefined;
  const includeImage =
    options.includeImages &&
    Boolean(imageSrc) &&
    (options.isNightMode || imageSrc !== options.landmarkImage);

  return {
    id: point.id,
    titleKey: getAccessPointTitleKey(point.id),
    codeLabelKey: getAccessPointCodeLabelKey(point.id),
    label: point.label || point.id,
    guideKey: point.guideKey,
    code: point.code,
    imageSrc: includeImage ? imageSrc : undefined,
    imageAlt: point.label || point.id,
    showCode: options.isNightMode && Boolean(point.code),
    missingCode: options.isNightMode && !point.code && Boolean(imageSrc),
  };
}

function buildAccessSteps(
  points: ReturnType<typeof normalizeAccessPoints>,
  options: {
    isNightMode: boolean;
    landmarkImage?: string;
    includeImages: boolean;
  }
): ArrivalAccessStep[] {
  return points.map((point) => buildStep(point, options));
}

export function resolveArrivalAccessPlan(
  settings: TenantSettings,
  _hostel: HostelConfig,
  isNightMode: boolean
): ArrivalAccessPlan {
  const allPoints = normalizeAccessPoints(settings);
  const guestFloor = resolveGuestFloor(settings);
  const points = filterAccessPointsForGuest(allPoints, guestFloor);
  const layoutKind = resolveLayoutKind(settings, allPoints);
  const landmarkSrc = resolveArrivalLandmark(settings);
  const landmark = landmarkSrc ? { imageSrc: landmarkSrc, imageAlt: 'Hostel landmark' } : null;
  const dayMode = resolveDayMode(settings, layoutKind);

  const daySteps = buildAccessSteps(points, {
    isNightMode: false,
    landmarkImage: landmark?.imageSrc,
    includeImages: true,
  });

  const nightSteps = buildAccessSteps(points, {
    isNightMode: true,
    landmarkImage: landmark?.imageSrc,
    includeImages: true,
  });

  const hasAnyDoorCode = points.some((point) => Boolean(point.code));
  const hasConfiguredAccess = points.length > 0 || Boolean(landmark);

  return {
    layoutKind,
    landmark,
    guestFloor,
    dayAccess: hasConfiguredAccess
      ? {
          mode: dayMode,
          banner: resolveDayBanner(layoutKind, dayMode),
          steps: daySteps.filter((step) => step.imageSrc || step.guideKey),
        }
      : null,
    nightAccess: hasConfiguredAccess
      ? {
          banner: resolveNightBanner(layoutKind),
          steps: nightSteps,
          hasAnyCode: hasAnyDoorCode,
        }
      : null,
    hasAnyDoorCode,
    steps: isNightMode ? nightSteps : daySteps,
  };
}

export function hasDoorAccessConfigured(settings: TenantSettings): boolean {
  const points = normalizeAccessPoints(settings);
  return Boolean(points.length || resolveArrivalLandmark(settings));
}

export function hasNightDoorCodes(settings: TenantSettings): boolean {
  return normalizeAccessPoints(settings).some((point) => Boolean(point.code));
}
