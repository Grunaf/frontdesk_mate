import type {
  ArrivalAccessPlan,
  ArrivalAccessStep,
  ArrivalBannerKeys,
  ArrivalLandmark,
} from '@/entities/tenant';

/** Matches `FindHostelSection` / `sections.find.*` banner keys. */
export const DOOR_ACCESS_LANDMARK_BANNER: ArrivalBannerKeys = {
  titleKey: 'sections.find.title',
  bannerKey: 'sections.find.banner',
  hasIcon: false,
};

export type DoorAccessSlideMedia = 'photo' | 'text';

/** Message resolved via `useTranslations('domains.hostel.enter')`. */
export type DoorAccessEnterMessage = {
  key: string;
  params?: Record<string, string>;
};

/** Message resolved via `useTranslations('domains.hostel.enter.doors')`. */
export type DoorAccessDoorsMessage = {
  key: string;
  params?: Record<string, string>;
};

export type DoorAccessSheetTitle =
  | DoorAccessEnterMessage
  | DoorAccessDoorsMessage
  | { literal: string };

export type DoorAccessSheetBody =
  | DoorAccessEnterMessage
  | DoorAccessDoorsMessage
  | { literal: string }
  | null;

export type DoorAccessSlideSheet = {
  sheetTitle: DoorAccessSheetTitle;
  sheetBody: DoorAccessSheetBody;
  sheetContext: 'landmark' | 'firstAccess' | 'access';
};

export type DoorAccessLandmarkSlide = {
  kind: 'landmark';
  landmark: ArrivalLandmark;
  banner: ArrivalBannerKeys;
  sheet: DoorAccessSlideSheet;
};

export type DoorAccessAccessSlide = {
  kind: 'access';
  step: ArrivalAccessStep;
  media: DoorAccessSlideMedia;
  sheet: DoorAccessSlideSheet;
};

export type DoorAccessSlide = DoorAccessLandmarkSlide | DoorAccessAccessSlide;

export interface BuildDoorAccessSlidesFlags {
  isNightMode: boolean;
  /** Night section title interpolation (`{time}`), typically reception close. */
  checkInTime?: string;
}

export interface DoorAccessSlidesResult {
  slides: DoorAccessSlide[];
  /**
   * Day or night section banner; not repeated on each slide.
   * @deprecated Prefer per-slide `sheet` on the first access slide (`sheetContext: 'firstAccess'`).
   */
  sectionBanner: ArrivalBannerKeys | null;
}

/**
 * Night: always `plan.nightAccess.steps` (same as `plan.steps` when `isNightMode`).
 * Day: `plan.dayAccess.steps` (guide/photo filter), not raw `plan.steps`.
 */
function resolveAccessSteps(plan: ArrivalAccessPlan, isNightMode: boolean): ArrivalAccessStep[] {
  if (isNightMode) {
    return plan.nightAccess?.steps ?? plan.steps;
  }
  return plan.dayAccess?.steps ?? plan.steps;
}

function resolveSectionBanner(plan: ArrivalAccessPlan, isNightMode: boolean): ArrivalBannerKeys | null {
  if (isNightMode) {
    return plan.nightAccess?.banner ?? null;
  }
  return plan.dayAccess?.banner ?? null;
}

function resolveAccessSlideMedia(step: ArrivalAccessStep, isNightMode: boolean): DoorAccessSlideMedia | null {
  if (step.imageSrc) return 'photo';
  if (step.guideNote) return 'text';
  if (isNightMode && (step.code || step.showCode)) return 'text';
  return null;
}

function enterTitleParams(titleKey: string, checkInTime?: string): Record<string, string> | undefined {
  const needsTime = titleKey.includes('night') || titleKey.includes('nightPreview');
  if (!needsTime) return undefined;
  return { time: checkInTime ?? '' };
}

function enterMessageFromBannerTitle(
  banner: ArrivalBannerKeys,
  checkInTime?: string
): DoorAccessEnterMessage {
  const params = enterTitleParams(banner.titleKey, checkInTime);
  return params ? { key: banner.titleKey, params } : { key: banner.titleKey };
}

function buildLandmarkSheet(): DoorAccessSlideSheet {
  return {
    sheetContext: 'landmark',
    sheetTitle: { key: DOOR_ACCESS_LANDMARK_BANNER.titleKey },
    sheetBody: { key: DOOR_ACCESS_LANDMARK_BANNER.bannerKey },
  };
}

function buildFirstAccessSheet(
  sectionBanner: ArrivalBannerKeys,
  checkInTime?: string
): DoorAccessSlideSheet {
  return {
    sheetContext: 'firstAccess',
    sheetTitle: enterMessageFromBannerTitle(sectionBanner, checkInTime),
    sheetBody: { key: sectionBanner.bannerKey },
  };
}

/** Step title: admin label when set, otherwise i18n under `enter.doors`. */
function buildAccessStepSheetTitle(step: ArrivalAccessStep): DoorAccessSheetTitle {
  if (step.label.trim()) {
    return { literal: step.label };
  }
  return { key: step.titleKey };
}

function buildAccessStepSheet(step: ArrivalAccessStep): DoorAccessSlideSheet {
  return {
    sheetContext: 'access',
    sheetTitle: buildAccessStepSheetTitle(step),
    sheetBody: step.guideNote ? { literal: step.guideNote } : null,
  };
}

export function buildDoorAccessSlides(
  plan: ArrivalAccessPlan,
  flags: BuildDoorAccessSlidesFlags
): DoorAccessSlidesResult {
  const { isNightMode, checkInTime } = flags;
  const slides: DoorAccessSlide[] = [];
  const sectionBanner = resolveSectionBanner(plan, isNightMode);

  // first access в built slides: first `kind: 'access'` entry in this array (panel filters must not recompute section banner against a filtered list).
  let firstAccessInBuiltSlides = true;

  if (plan.landmark) {
    slides.push({
      kind: 'landmark',
      landmark: plan.landmark,
      banner: DOOR_ACCESS_LANDMARK_BANNER,
      sheet: buildLandmarkSheet(),
    });
  }

  for (const step of resolveAccessSteps(plan, isNightMode)) {
    const media = resolveAccessSlideMedia(step, isNightMode);
    if (!media) continue;

    const sheet =
      firstAccessInBuiltSlides && sectionBanner
        ? buildFirstAccessSheet(sectionBanner, checkInTime)
        : buildAccessStepSheet(step);

    firstAccessInBuiltSlides = false;

    slides.push({ kind: 'access', step, media, sheet });
  }

  return {
    slides,
    sectionBanner,
  };
}
